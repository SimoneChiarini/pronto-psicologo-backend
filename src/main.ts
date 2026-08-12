import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true conserva il body grezzo (necessario per verificare la firma dei webhook Stripe)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Origini consentite: domini di produzione Firebase Hosting + eventuale FRONTEND_URL,
  // più localhost (qualsiasi porta) per lo sviluppo web.
  const allowedOrigins = [
    'https://prontopsicologo-61658.web.app',
    'https://prontopsicologo-61658.firebaseapp.com',
    process.env.FRONTEND_URL?.replace(/\/$/, ''),
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Nessun Origin = app mobile / curl / server-to-server → sempre permesso
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin non consentita da CORS: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('ProntoPsicologo API')
    .setDescription('API per la piattaforma di supporto psicologico')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();