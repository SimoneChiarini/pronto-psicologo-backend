import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Come JwtAuthGuard ma non blocca le richieste anonime: se il token è assente
 * o non valido `req.user` resta null invece di rispondere 401.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
