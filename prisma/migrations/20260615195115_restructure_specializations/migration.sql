/*
  Warnings:

  - You are about to drop the column `specAnsia` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specAutostima` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specCoppia` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specDipendenze` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specDisturbiAlimentari` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specGenitorialita` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specInfanzia` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specLutto` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specNeurodivergenze` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specRelazioni` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specSessualita` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specStress` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specTrauma` on the `Psychologist` table. All the data in the column will be lost.
  - You are about to drop the column `specUmore` on the `Psychologist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Psychologist" DROP COLUMN "specAnsia",
DROP COLUMN "specAutostima",
DROP COLUMN "specCoppia",
DROP COLUMN "specDipendenze",
DROP COLUMN "specDisturbiAlimentari",
DROP COLUMN "specGenitorialita",
DROP COLUMN "specInfanzia",
DROP COLUMN "specLutto",
DROP COLUMN "specNeurodivergenze",
DROP COLUMN "specRelazioni",
DROP COLUMN "specSessualita",
DROP COLUMN "specStress",
DROP COLUMN "specTrauma",
DROP COLUMN "specUmore";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" VARCHAR(200),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PsychologistSpecialization" (
    "psychologistId" UUID NOT NULL,
    "tagCode" VARCHAR(100) NOT NULL,

    CONSTRAINT "PsychologistSpecialization_pkey" PRIMARY KEY ("psychologistId","tagCode")
);

-- CreateIndex
CREATE INDEX "PsychologistSpecialization_tagCode_idx" ON "PsychologistSpecialization"("tagCode");

-- AddForeignKey
ALTER TABLE "PsychologistSpecialization" ADD CONSTRAINT "PsychologistSpecialization_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "Psychologist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
