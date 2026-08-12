import * as https from 'https';
import * as crypto from 'crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, CONTRACT_VERSION } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private firebaseService: FirebaseService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { latitude, longitude },
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  async getFcmToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    return { fcmToken: user?.fcmToken ?? null };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });
    if (!user) throw new UnauthorizedException('Utente non trovato');
    const { id, ...rest } = user;
    return { userId: id, ...rest };
  }

  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Utente non trovato');
    if (user.emailVerified) return { message: 'Email già verificata' };

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken, emailVerificationExpires },
    });
    await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);
    return { message: 'Email di verifica inviata' };
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Token non valido o scaduto');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }

  async verifyPhone(userId: string, firebaseToken: string): Promise<{ message: string }> {
    const decoded = await this.firebaseService.verifyIdToken(firebaseToken);
    if (!decoded || !decoded.phone_number) {
      throw new UnauthorizedException('Token Firebase non valido');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { phone: decoded.phone_number, phoneVerified: true },
    });
    return { message: 'Telefono verificato' };
  }

  async register(registerDto: RegisterDto) {
    if (registerDto.role === 'PSYCHOLOGIST' && !registerDto.contractAccepted) {
      throw new BadRequestException('Devi accettare il contratto di abbonamento per registrarti come psicologo');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Il geocoding fa chiamate HTTP esterne lente: lo eseguiamo PRIMA della
    // transazione, per non tenere aperta una transazione DB durante l'I/O di rete.
    const geocoded: { address: string; lat?: number; lng?: number }[] = [];
    if (registerDto.role === 'PSYCHOLOGIST') {
      for (const addr of registerDto.addresses ?? []) {
        if (!addr.trim()) continue;
        const coords = await this.geocodeAddress(addr.trim());
        geocoded.push({ address: addr.trim(), lat: coords?.lat, lng: coords?.lng });
      }
    }

    // Tutte le scritture DB in un'unica transazione: se qualcosa fallisce a metà
    // (es. alboCode duplicato) non resta un utente orfano.
    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          role: registerDto.role,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone ?? null,
          emailVerificationToken,
          emailVerificationExpires,
        },
      });

      if (registerDto.role === 'PSYCHOLOGIST') {
        const psychData: any = {
          userId: user.id,
          alboCode: registerDto.alboCode!,
          bio: registerDto.bio,
          phone: registerDto.phone,
          profileImage: registerDto.profileImage,
          isMale: registerDto.isMale,
          isOnlineOnly: registerDto.isOnlineOnly ?? false,
          isPsychotherapist: registerDto.isPsychotherapist ?? false,
          // Abbonamento: il piano scelto viene salvato subito; l'incasso e
          // l'attivazione (subscriptionActive) avvengono dopo la verifica albo.
          subscriptionPlan: registerDto.subscriptionPlan ?? null,
          subscriptionActive: false,
          contractVersion: CONTRACT_VERSION,
          contractAcceptedAt: new Date(),
        };

        if (!registerDto.isOnlineOnly && geocoded.length > 0 && geocoded[0].lat != null) {
          psychData.latitude = geocoded[0].lat;
          psychData.longitude = geocoded[0].lng;
        }

        const created = await tx.psychologist.create({ data: psychData });

        if (geocoded.length > 0) {
          await tx.psychologistAddress.createMany({
            data: geocoded.map(ga => ({
              psychologistId: created.id,
              address: ga.address,
              latitude: ga.lat,
              longitude: ga.lng,
            })),
          });
        }

        if (registerDto.tagCodes && registerDto.tagCodes.length > 0) {
          await tx.psychologistSpecialization.createMany({
            data: registerDto.tagCodes.map(code => ({ psychologistId: created.id, tagCode: code })),
            skipDuplicates: true,
          });
        }
      }

      return user;
    });

    // Email di verifica solo dopo il commit (fire-and-forget)
    this.emailService
      .sendVerificationEmail(user.email, emailVerificationToken)
      .catch(() => {});

    return this.login(user);
  }

  private geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'nominatim.openstreetmap.org',
        path: `/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        headers: { 'User-Agent': 'ProntoPsicologo/1.0 (simo.chiaro1997prato@gmail.com)' },
      };
      https.get(options, (res) => {
        let raw = '';
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(raw) as Array<{ lat: string; lon: string }>;
            if (!json.length) return resolve(null);
            resolve({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) });
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }
}
