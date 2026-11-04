import { Prisma } from '@prisma/client';

/**
 * Campi di Psychologist visibili a chiunque (profilo pubblico).
 * Esclusi di proposito: userId, stripe*, subscription*, contract*,
 * alboCheckResult/alboVerifiedAt (uso interno admin).
 * Il telefono è quello professionale dello studio, mostrato nella scheda.
 */
export const PUBLIC_PSYCH_FIELDS = {
  id: true,
  bio: true,
  alboCode: true,
  verified: true,
  alboVerified: true,
  alboOrdine: true,
  alboSezione: true,
  profileImage: true,
  coverImage: true,
  phone: true,
  latitude: true,
  longitude: true,
  isOnlineOnly: true,
  isPsychotherapist: true,
  isMale: true,
  createdAt: true,
} satisfies Prisma.PsychologistSelect;

export const PUBLIC_PSYCH_USER = {
  select: { firstName: true, lastName: true, profileImage: true },
} satisfies Prisma.UserDefaultArgs;

/** Psicologo pubblico annidato in altre risorse (post, risposte, appuntamenti). */
export const PUBLIC_PSYCH_SELECT = {
  ...PUBLIC_PSYCH_FIELDS,
  user: PUBLIC_PSYCH_USER,
} satisfies Prisma.PsychologistSelect;
