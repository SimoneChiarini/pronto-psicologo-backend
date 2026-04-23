-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "expandMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAnswers" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
