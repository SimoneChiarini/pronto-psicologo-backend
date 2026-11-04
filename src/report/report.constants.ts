// Motivi di segnalazione — tenere allineato con flutter_app/lib/data/report_reasons.dart
export const REPORT_REASONS = {
  OFFENSIVE_LANGUAGE: 'Linguaggio offensivo o inappropriato',
  HARASSMENT: 'Molestie o minacce',
  UNPROFESSIONAL: 'Comportamento non professionale',
  SPAM: 'Spam o pubblicità',
  FAKE_PROFILE: 'Profilo falso o identità non veritiera',
  PRIVACY: 'Violazione della privacy',
  OFF_PLATFORM_PAYMENT: 'Richiesta di pagamenti fuori piattaforma',
  OTHER: 'Altro',
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export const REPORT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
