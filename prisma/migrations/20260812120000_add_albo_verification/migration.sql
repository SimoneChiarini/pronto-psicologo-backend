-- Verifica automatica iscrizione Albo (CNOP) per nome/cognome
ALTER TABLE "Psychologist"
  ADD COLUMN "alboVerified" BOOLEAN DEFAULT false,
  ADD COLUMN "alboVerifiedAt" TIMESTAMP(6),
  ADD COLUMN "alboOrdine" VARCHAR(50),
  ADD COLUMN "alboSezione" VARCHAR(5),
  ADD COLUMN "alboCheckResult" VARCHAR(20);
