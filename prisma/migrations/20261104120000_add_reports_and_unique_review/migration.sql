-- Segnalazioni + una sola recensione per coppia utente/psicologo
-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporterUserId" UUID NOT NULL,
    "reportedUserId" UUID NOT NULL,
    "conversationId" UUID,
    "reason" VARCHAR(40) NOT NULL,
    "details" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(6),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");

-- Rimuove eventuali recensioni duplicate (stesso utente → stesso psicologo),
-- tenendo la più recente, prima di creare il vincolo di unicità.
DELETE FROM "Review" r
USING "Review" r2
WHERE r."userId" = r2."userId"
  AND r."psychologistId" = r2."psychologistId"
  AND (COALESCE(r."createdAt", 'epoch'), r."id") < (COALESCE(r2."createdAt", 'epoch'), r2."id");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_psychologistId_key" ON "Review"("userId", "psychologistId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

