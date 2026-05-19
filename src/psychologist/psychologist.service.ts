import * as https from 'https';
import { Injectable } from '@nestjs/common';
import { Prisma, Psychologist } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class PsychologistService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.PsychologistCreateInput | Prisma.PsychologistUncheckedCreateInput): Promise<Psychologist> {
    return this.prisma.psychologist.create({ data });
  }

  async findAll() {
    const psychologists = await this.prisma.psychologist.findMany({
      include: {
        Review: { select: { rating: true } },
        user: { select: { firstName: true, lastName: true } },
        addresses: true,
      },
    });
    return psychologists.map(p => {
      const { Review, ...rest } = p;
      const avgRating = Review.length > 0
        ? Math.round((Review.reduce((s, r) => s + r.rating, 0) / Review.length) * 10) / 10
        : null;
      return { ...rest, avgRating, reviewCount: Review.length };
    });
  }

  findOne(id: string) {
    return this.prisma.psychologist.findUnique({ where: { id }, include: { addresses: true } });
  }

  findByUserId(userId: string) {
    return this.prisma.psychologist.findUnique({ where: { userId }, include: { addresses: true } });
  }

  async update(id: string, data: Record<string, any>): Promise<Psychologist> {
    const { addresses, ...updateData } = data;

    if (Array.isArray(addresses)) {
      const validAddrs = (addresses as string[]).filter(a => typeof a === 'string' && a.trim());

      // Geocodifica tutti gli indirizzi
      const geocoded: { address: string; lat?: number; lng?: number }[] = [];
      for (const addr of validAddrs) {
        const coords = await this.geocodeAddress(addr.trim());
        geocoded.push({ address: addr.trim(), lat: coords?.lat, lng: coords?.lng });
      }

      // Coordinate primarie dal primo indirizzo (se non online only)
      if (!updateData.isOnlineOnly && geocoded.length > 0 && geocoded[0].lat != null) {
        updateData.latitude = geocoded[0].lat;
        updateData.longitude = geocoded[0].lng;
      } else if (updateData.isOnlineOnly || geocoded.length === 0) {
        updateData.latitude = null;
        updateData.longitude = null;
      }

      // Sostituisce tutti gli indirizzi esistenti
      await this.prisma.psychologistAddress.deleteMany({ where: { psychologistId: id } });
      for (const ga of geocoded) {
        await this.prisma.psychologistAddress.create({
          data: { psychologistId: id, address: ga.address, latitude: ga.lat, longitude: ga.lng },
        });
      }
    }

    return this.prisma.psychologist.update({ where: { id }, data: updateData });
  }

  remove(id: string): Promise<Psychologist> {
    return this.prisma.psychologist.delete({ where: { id } });
  }

  async aiRank(query: string): Promise<any[]> {
    const psychologists = await this.findAll();
    if (!psychologists.length) return [];
    if (!process.env.ANTHROPIC_API_KEY) return psychologists;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const specLabelMap: Record<string, string> = {
      specAnsia: 'Ansia', specUmore: 'Umore/depressione', specStress: 'Stress/lavoro',
      specRelazioni: 'Relazioni', specCoppia: 'Coppia', specGenitorialita: 'Genitorialità',
      specInfanzia: 'Infanzia/adolescenza', specAutostima: 'Autostima', specTrauma: 'Trauma',
      specLutto: 'Lutto', specSessualita: 'Sessualità', specDisturbiAlimentari: 'Disturbi alimentari',
      specDipendenze: 'Dipendenze', specNeurodivergenze: 'Neurodivergenze',
    };

    const psychContext = psychologists.map(p => ({
      id: p.id,
      bio: (p as any).bio ?? '',
      specs: Object.keys(specLabelMap).filter(k => (p as any)[k] === true).map(k => specLabelMap[k]),
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
      return psychologists
        .map(p => ({
          ...p,
          aiScore: rankMap.get(p.id)?.score ?? 0,
          aiReason: rankMap.get(p.id)?.reason ?? '',
        }))
        .sort((a, b) => (b.aiScore as number) - (a.aiScore as number));
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
