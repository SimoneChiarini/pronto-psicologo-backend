import * as https from 'https';
import { Injectable } from '@nestjs/common';
import { Prisma, Psychologist } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PsychologistService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.PsychologistCreateInput | Prisma.PsychologistUncheckedCreateInput): Promise<Psychologist> {
    return this.prisma.psychologist.create({ data });
  }

  async findAll() {
    const psychologists = await this.prisma.psychologist.findMany({
      include: { Review: { select: { rating: true } }, user: { select: { firstName: true, lastName: true } } },
    });
    return psychologists.map(p => {
      const { Review, ...rest } = p;
      const avgRating = Review.length > 0
        ? Math.round((Review.reduce((s, r) => s + r.rating, 0) / Review.length) * 10) / 10
        : null;
      return { ...rest, avgRating, reviewCount: Review.length };
    });
  }

  findOne(id: string): Promise<Psychologist | null> {
    return this.prisma.psychologist.findUnique({ where: { id } });
  }

  findByUserId(userId: string): Promise<Psychologist | null> {
    return this.prisma.psychologist.findUnique({ where: { userId } });
  }

  async update(id: string, data: Record<string, any>): Promise<Psychologist> {
    const updateData: Record<string, any> = { ...data };
    if (typeof data.address === 'string' && data.address.trim()) {
      const coords = await this.geocodeAddress(data.address.trim());
      if (coords) {
        updateData.latitude = coords.lat;
        updateData.longitude = coords.lng;
      }
    }
    return this.prisma.psychologist.update({ where: { id }, data: updateData });
  }

  remove(id: string): Promise<Psychologist> {
    return this.prisma.psychologist.delete({ where: { id } });
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
          } catch { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
  }
}
