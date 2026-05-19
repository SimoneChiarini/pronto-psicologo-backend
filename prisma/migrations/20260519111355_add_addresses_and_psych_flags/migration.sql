/*
  Warnings:

  - You are about to drop the column `address` on the `Psychologist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Psychologist" DROP COLUMN "address",
ADD COLUMN     "isOnlineOnly" BOOLEAN DEFAULT false,
ADD COLUMN     "isPsychotherapist" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "PsychologistAddress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "psychologistId" UUID NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PsychologistAddress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PsychologistAddress" ADD CONSTRAINT "PsychologistAddress_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "Psychologist"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
