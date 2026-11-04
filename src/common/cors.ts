// Origini consentite: domini di produzione Firebase Hosting + eventuale FRONTEND_URL,
// più localhost (qualsiasi porta) per lo sviluppo web. Usata da HTTP e WebSocket.
const allowedOrigins = [
  'https://prontopsicologo-61658.web.app',
  'https://prontopsicologo-61658.firebaseapp.com',
  process.env.FRONTEND_URL?.replace(/\/$/, ''),
].filter(Boolean) as string[];

export function isAllowedOrigin(origin: string | undefined): boolean {
  // Nessun Origin = app mobile / curl / server-to-server → sempre permesso
  if (!origin) return true;
  return allowedOrigins.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
}

export const corsOriginCallback = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => (isAllowedOrigin(origin) ? callback(null, true) : callback(new Error(`Origin non consentita da CORS: ${origin}`), false));
