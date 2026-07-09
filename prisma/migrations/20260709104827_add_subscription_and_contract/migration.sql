-- AlterTable
ALTER TABLE "Psychologist" ADD COLUMN     "contractAcceptedAt" TIMESTAMP(6),
ADD COLUMN     "contractVersion" VARCHAR(20),
ADD COLUMN     "subscriptionPlan" VARCHAR(20);
