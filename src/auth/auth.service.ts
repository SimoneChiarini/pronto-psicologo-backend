import * as https from 'https';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

  async register(registerDto: RegisterDto) {
    console.log('Register attempt:', registerDto);
    try {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          role: registerDto.role,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
      });

      if (registerDto.role === 'PSYCHOLOGIST') {
        const psychData: any = {
          userId: user.id,
          alboCode: registerDto.alboCode || user.id,
          bio: registerDto.bio,
          address: registerDto.address,
          phone: registerDto.phone,
          profileImage: registerDto.profileImage,
          isMale: registerDto.isMale,
          specAnsia: registerDto.specAnsia,
          specUmore: registerDto.specUmore,
          specStress: registerDto.specStress,
          specRelazioni: registerDto.specRelazioni,
          specCoppia: registerDto.specCoppia,
          specGenitorialita: registerDto.specGenitorialita,
          specInfanzia: registerDto.specInfanzia,
          specAutostima: registerDto.specAutostima,
          specTrauma: registerDto.specTrauma,
          specLutto: registerDto.specLutto,
          specSessualita: registerDto.specSessualita,
          specDisturbiAlimentari: registerDto.specDisturbiAlimentari,
          specDipendenze: registerDto.specDipendenze,
          specNeurodivergenze: registerDto.specNeurodivergenze,
        };

        // Geocodifica l'indirizzo al momento della registrazione
        if (registerDto.address) {
          const coords = await this.geocodeAddress(registerDto.address);
          if (coords) {
            psychData.latitude = coords.lat;
            psychData.longitude = coords.lng;
          }
        }

        console.log('[Register] psychData before create:', JSON.stringify(psychData));
        const created = await this.prisma.psychologist.create({ data: psychData });
        console.log('[Register] psychologist created, lat:', created.latitude, 'lng:', created.longitude);
      }

      return this.login(user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  private geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'nominatim.openstreetmap.org',
        path: `/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        headers: { 'User-Agent': 'ProntoPsicologo/1.0 (simo.chiaro1997prato@gmail.com)' },
      };
      https.get(options, (res) => {
        console.log('[Geocoding] status:', res.statusCode, 'address:', address);
        let raw = '';
        res.on('data', (chunk: string) => { raw += chunk; });
        res.on('end', () => {
          console.log('[Geocoding] response:', raw.substring(0, 300));
          try {
            const json = JSON.parse(raw) as Array<{ lat: string; lon: string }>;
            if (!json.length) { console.log('[Geocoding] no results'); return resolve(null); }
            const coords = { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
            console.log('[Geocoding] success:', coords);
            resolve(coords);
          } catch (e) {
            console.log('[Geocoding] parse error:', e);
            resolve(null);
          }
        });
      }).on('error', (e) => {
        console.log('[Geocoding] network error:', e.message);
        resolve(null);
      });
    });
  }
}
