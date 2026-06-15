import * as https from 'https';
import { Injectable } from '@nestjs/common';
import { Prisma, Psychologist } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { TAG_LABEL_MAP } from '../specialization/taxonomy';

const AI_CACHE_TTL_MS = 60_000; // 60 secondi

@Injectable()
export class PsychologistService {
  private readonly anthropic = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

  private readonly aiCache = new Map<string, { result: any[]; expiresAt: number }>();

  constructor(private prisma: PrismaService) {}

  create(data: Prisma.PsychologistCreateInput | Prisma.PsychologistUncheckedCreateInput): Promise<Psychologist> {
    return this.prisma.psychologist.create({ data });
  }

  private readonly PSYCH_INCLUDE = {
    Review: { select: { rating: true } },
    user: { select: { firstName: true, lastName: true } },
    addresses: true,
    specializations: { select: { tagCode: true } },
  };

  async findAll() {
    const psychologists = await this.prisma.psychologist.findMany({
      include: this.PSYCH_INCLUDE,
    });
    return psychologists.map(p => this.withRating(p));
  }

  findOne(id: string) {
    return this.prisma.psychologist.findUnique({
      where: { id },
      include: { addresses: true, specializations: { select: { tagCode: true } } },
    }).then(p => p ? this.withRating(p as any) : null);
  }

  findByUserId(userId: string) {
    return this.prisma.psychologist.findUnique({
      where: { userId },
      include: { addresses: true, specializations: { select: { tagCode: true } } },
    }).then(p => p ? this.withRating(p as any) : null);
  }

  private withRating(p: any) {
    const reviews = p.Review ?? [];
    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;
    const { Review, ...rest } = p;
    const tagCodes: string[] = (p.specializations ?? []).map((s: any) => s.tagCode);
    return {
      ...rest,
      tagCodes,
      tagLabels: tagCodes.map(code => TAG_LABEL_MAP.get(code) ?? code),
      avgRating,
      reviewCount: reviews.length,
    };
  }

  async update(id: string, data: Record<string, any>): Promise<Psychologist> {
    const { addresses, tagCodes, ...updateData } = data;

    if (Array.isArray(addresses)) {
      const validAddrs = (addresses as string[]).filter(a => typeof a === 'string' && a.trim());
      const geocoded: { address: string; lat?: number; lng?: number }[] = [];
      for (const addr of validAddrs) {
        const coords = await this.geocodeAddress(addr.trim());
        geocoded.push({ address: addr.trim(), lat: coords?.lat, lng: coords?.lng });
      }
      if (!updateData.isOnlineOnly && geocoded.length > 0 && geocoded[0].lat != null) {
        updateData.latitude = geocoded[0].lat;
        updateData.longitude = geocoded[0].lng;
      } else if (updateData.isOnlineOnly || geocoded.length === 0) {
        updateData.latitude = null;
        updateData.longitude = null;
      }
      await this.prisma.psychologistAddress.deleteMany({ where: { psychologistId: id } });
      for (const ga of geocoded) {
        await this.prisma.psychologistAddress.create({
          data: { psychologistId: id, address: ga.address, latitude: ga.lat, longitude: ga.lng },
        });
      }
    }

    if (Array.isArray(tagCodes)) {
      await this.prisma.psychologistSpecialization.deleteMany({ where: { psychologistId: id } });
      if (tagCodes.length > 0) {
        await this.prisma.psychologistSpecialization.createMany({
          data: tagCodes.map((code: string) => ({ psychologistId: id, tagCode: code })),
          skipDuplicates: true,
        });
      }
    }

    return this.prisma.psychologist.update({ where: { id }, data: updateData });
  }

  remove(id: string): Promise<Psychologist> {
    return this.prisma.psychologist.delete({ where: { id } });
  }

  async aiRank(query: string): Promise<any[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = this.aiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const psychologists = await this.findAll();
    if (!psychologists.length) return [];
    if (!this.anthropic) return psychologists;

    const client = this.anthropic;

    const specLabelMap: Record<string, string> = Object.fromEntries(TAG_LABEL_MAP);

    const psychContext = psychologists.map(p => ({
      id: p.id,
      bio: (p as any).bio ?? '',
      specs: ((p as any).tagCodes as string[] ?? []).map(code => specLabelMap[code] ?? code),
      isPsychotherapist: (p as any).isPsychotherapist ?? false,
    }));

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Sei un assistente che aiuta a trovare lo psicologo più adatto.
L'utente ha scritto: "${query}"

Analizza bio e specializzazioni e restituisci un ranking dal più al meno pertinente.

Psicologi:
${JSON.stringify(psychContext)}

Rispondi ESCLUSIVAMENTE con un array JSON (zero altro testo):
[{"id":"...","score":85,"reason":"motivazione breve max 8 parole"}]

Punteggi 0-100, ordinati dal più alto al più basso.`,
      }],
    });

    try {
      const text = (response.content[0] as any).text as string;
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) return psychologists;
      const rankings: { id: string; score: number; reason: string }[] = JSON.parse(match[0]);
      const rankMap = new Map(rankings.map(r => [r.id, r]));
      const ranked = psychologists
        .map(p => ({
          ...p,
          aiScore: rankMap.get(p.id)?.score ?? 0,
          aiReason: rankMap.get(p.id)?.reason ?? '',
        }))
        .sort((a, b) => (b.aiScore as number) - (a.aiScore as number));
      this.aiCache.set(cacheKey, { result: ranked, expiresAt: Date.now() + AI_CACHE_TTL_MS });
      return ranked;
    } catch {
      return psychologists;
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
