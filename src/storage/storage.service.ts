import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Astrae lo storage dei file caricati.
 * - Se le env var R2_* sono configurate: carica su Cloudflare R2 (S3-compatibile) e
 *   restituisce un URL pubblico assoluto (persistente tra i deploy).
 * - Altrimenti: fallback su disco locale `uploads/` (comodo in sviluppo).
 *   ⚠️ Su hosting con filesystem effimero (es. Railway) il fallback su disco NON è
 *   persistente: in produzione vanno configurate le R2_*.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly bucket = process.env.R2_BUCKET;
  private readonly publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  private readonly client: S3Client | null = this.buildClient();

  /** True se R2 è configurato correttamente. */
  get usesRemote(): boolean {
    return this.client !== null && !!this.bucket && !!this.publicUrl;
  }

  private buildClient(): S3Client | null {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey || !process.env.R2_BUCKET || !process.env.R2_PUBLIC_URL) {
      this.logger.warn('R2 non configurato: gli upload useranno il disco locale (non persistente in produzione).');
      return null;
    }
    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /**
   * Salva un file e ne restituisce l'URL.
   * Su R2 → URL assoluto (es. https://cdn.tuodominio.it/<key>).
   * Su disco → path relativo servito dal backend (es. /uploads/<key>).
   */
  async saveImage(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    if (this.usesRemote) {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket!,
          Key: filename,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return `${this.publicUrl}/${filename}`;
    }

    // Fallback disco locale
    const dir = join(process.cwd(), 'uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, filename), buffer);
    return `/uploads/${filename}`;
  }
}
