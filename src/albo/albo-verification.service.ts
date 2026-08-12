import { Injectable, Logger } from '@nestjs/common';

export type AlboCheckResult = 'MATCH' | 'AMBIGUOUS' | 'NOT_FOUND' | 'ERROR';

export interface AlboVerification {
  result: AlboCheckResult;
  ordine?: string;   // regione dell'Ordine (es. "Toscana")
  sezione?: string;  // A / B
  idPersona?: string;
}

interface AlboRecord {
  nome: string;
  cognome: string;
  ordine: string;
  sezione: string;
  stato: string; // "A" = attivo
  idPersona: string;
}

/**
 * Verifica l'iscrizione di uno psicologo all'Albo Unico Nazionale (CNOP)
 * interrogando l'endpoint pubblico di ricerca.
 *
 * ⚠️ L'endpoint (`/open-api/albo-nazionale/cerca`) è pubblico ma NON ufficiale:
 * fa match per sottostringa su nome/cognome e non espone il numero d'albo.
 * Perciò facciamo un confronto ESATTO (normalizzato) lato nostro e verifichiamo
 * solo per nome+cognome sulle posizioni ATTIVE. Il numero d'albo digitato resta
 * un dato dichiarato, non confrontabile con questa fonte.
 */
@Injectable()
export class AlboVerificationService {
  private readonly logger = new Logger(AlboVerificationService.name);
  private readonly endpoint = 'https://areariservata.psy.it/open-api/albo-nazionale/cerca';

  /** Normalizza per confronto: maiuscolo, senza accenti, spazi compattati. */
  private normalize(s: string): string {
    return (s ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '') // rimuove i diacritici (accenti)
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** True se il nome cercato combacia col record (cognome esatto, nome come token). */
  private isExactMatch(record: AlboRecord, firstName: string, lastName: string): boolean {
    const recCognome = this.normalize(record.cognome);
    const recNomeTokens = this.normalize(record.nome).split(' ');
    const inCognome = this.normalize(lastName);
    const inNome = this.normalize(firstName);
    // Cognome: uguaglianza esatta. Nome: uguale, oppure presente tra i nomi propri
    // (gestisce i nomi composti tipo "ALICE GIOVANNA MARIA").
    const cognomeOk = recCognome === inCognome;
    const nomeOk = this.normalize(record.nome) === inNome || recNomeTokens.includes(inNome);
    return cognomeOk && nomeOk;
  }

  async verify(firstName: string, lastName: string): Promise<AlboVerification> {
    if (!firstName?.trim() || !lastName?.trim()) {
      return { result: 'NOT_FOUND' };
    }

    let records: AlboRecord[];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://areariservata.psy.it',
          Referer: 'https://areariservata.psy.it/albonazionale/ricerca',
        },
        body: JSON.stringify({
          offset: 0,
          limit: 50,
          pageIndex: 0,
          cognome: lastName.trim(),
          nome: firstName.trim(),
          ordine: null,
          provincia: null,
          convenzioni: null,
          lingue: [],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        this.logger.warn(`Registro albo HTTP ${res.status} per ${firstName} ${lastName}`);
        return { result: 'ERROR' };
      }
      const json = (await res.json()) as { data?: AlboRecord[] };
      records = json.data ?? [];
    } catch (err) {
      this.logger.warn(`Registro albo irraggiungibile: ${(err as Error).message}`);
      return { result: 'ERROR' };
    }

    // Solo posizioni attive e con nome/cognome ESATTAMENTE corrispondenti
    const exact = records.filter(
      (r) => r.stato === 'A' && this.isExactMatch(r, firstName, lastName),
    );

    if (exact.length === 1) {
      const m = exact[0];
      return { result: 'MATCH', ordine: m.ordine, sezione: m.sezione, idPersona: m.idPersona };
    }
    if (exact.length > 1) {
      return { result: 'AMBIGUOUS' };
    }
    return { result: 'NOT_FOUND' };
  }
}
