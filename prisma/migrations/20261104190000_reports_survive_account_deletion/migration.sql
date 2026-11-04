-- Le segnalazioni sopravvivono alla cancellazione dell'account (FK SetNull + nome salvato)
-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reporterUserId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_reportedUserId_fkey";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "reportedLabel" VARCHAR(255),
ALTER COLUMN "reporterUserId" DROP NOT NULL,
ALTER COLUMN "reportedUserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Compila il nome del segnalato per le segnalazioni già esistenti
UPDATE "Report" r
SET "reportedLabel" = COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u."firstName", u."lastName")), ''), u.email) || ' (' || CASE WHEN u.role = 'PSYCHOLOGIST' THEN 'psicologo' ELSE 'utente' END || ')'
FROM "User" u
WHERE u.id = r."reportedUserId" AND r."reportedLabel" IS NULL;
