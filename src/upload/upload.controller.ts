import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

// Solo immagini: MIME accettati e relativa estensione (non ci fidiamo del nome file del client)
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Controller('upload')
export class UploadController {
  constructor(private readonly storage: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME[file.mimetype]) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Formato non supportato: sono ammesse solo immagini JPEG, PNG o WebP'), false);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nessun file ricevuto');
    // Nome file generato lato server; estensione dal MIME verificato
    const ext = ALLOWED_MIME[file.mimetype];
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const url = await this.storage.saveImage(file.buffer, filename, file.mimetype);
    return { url };
  }
}
