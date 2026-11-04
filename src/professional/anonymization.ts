import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Controllo euristico di dati identificativi nei testi dei casi clinici
 * (codice deontologico: condividere solo lo stretto necessario, sempre in
 * forma anonima). AVVISA e non blocca: le regex sbagliano in entrambe le
 * direzioni, la responsabilità resta del professionista che conferma.
 */
const CHECKS: { label: string; re: RegExp }[] = [
  { label: 'un indirizzo email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { label: 'un numero di telefono', re: /(?:\+39[\s.-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{3,4}\b|\b0\d{1,3}[\s.-]?\d{5,8}\b/ },
  { label: 'un codice fiscale', re: /\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/i },
  { label: 'una data precisa', re: /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/ },
  { label: 'un indirizzo (via/piazza…)', re: /\b(?:via|viale|piazza|corso|vicolo|largo)\s+[A-ZÀ-Ü][\wÀ-ü']+/ },
  { label: 'un CAP', re: /\b\d{5}\b/ },
  {
    label: 'un nome proprio preceduto da un titolo o da "si chiama"',
    re: /\b(?:sig\.?|sig\.ra|signor[ae]?|dott\.?(?:ssa)?|si chiama|di nome)\s+[A-ZÀ-Ü][a-zà-ü]+/i,
  },
];

export function findIdentifiers(...texts: (string | null | undefined)[]): string[] {
  const text = texts.filter(Boolean).join('\n');
  return CHECKS.filter(c => c.re.test(text)).map(c => c.label);
}

/** Se trova possibili identificativi e l'autore non li ha già visti e confermati, risponde 422. */
export function assertAnonymized(acknowledged: boolean | undefined, ...texts: (string | null | undefined)[]) {
  if (acknowledged) return;
  const warnings = findIdentifiers(...texts);
  if (warnings.length) {
    throw new UnprocessableEntityException({
      code: 'ANONYMIZATION_WARNINGS',
      message: 'Il testo potrebbe contenere dati che rendono riconoscibile il paziente.',
      warnings,
    });
  }
}

/** Solo link https verso servizi di videochiamata noti. */
const MEETING_HOSTS = [
  'meet.google.com', 'teams.microsoft.com', 'teams.live.com',
  'zoom.us', 'meet.jit.si', 'whereby.com',
];

export function isAllowedMeetingUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return MEETING_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}
