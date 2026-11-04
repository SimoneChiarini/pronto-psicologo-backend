-- Area professionisti: intervisioni, supervisioni, incontri, pagamenti supervisione (solo tabelle/colonne nuove)
-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "maxGroupMembers" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "caseMessageId" UUID;

-- CreateTable
CREATE TABLE "PeerGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(20) NOT NULL DEFAULT 'INTERVISION',
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "visibility" VARCHAR(10) NOT NULL DEFAULT 'PUBLIC',
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" UUID,
    "archivedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerGroupMember" (
    "groupId" UUID NOT NULL,
    "psychologistId" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "confidentialityAcceptedAt" TIMESTAMP(6),
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerGroupMember_pkey" PRIMARY KEY ("groupId","psychologistId")
);

-- CreateTable
CREATE TABLE "CaseDiscussion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "ageRange" VARCHAR(20),
    "setting" VARCHAR(30),
    "presentingProblem" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    "anonymizationConfirmedAt" TIMESTAMP(6) NOT NULL,
    "lastActivityAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "authorId" UUID,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(6),

    CONSTRAINT "CaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMeeting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "createdById" UUID,
    "title" VARCHAR(160) NOT NULL,
    "startsAt" TIMESTAMP(6) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorProfile" (
    "psychologistId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "bio" TEXT,
    "orientation" VARCHAR(120),
    "yearsExperience" INTEGER,
    "priceIndividualCents" INTEGER NOT NULL,
    "pricePerParticipantCents" INTEGER NOT NULL,
    "stripeAccountId" VARCHAR(100),
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorProfile_pkey" PRIMARY KEY ("psychologistId")
);

-- CreateTable
CREATE TABLE "Supervision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supervisorId" UUID,
    "createdById" UUID,
    "mode" VARCHAR(15) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "caseSummary" TEXT NOT NULL,
    "status" VARCHAR(15) NOT NULL DEFAULT 'REQUESTED',
    "priceCents" INTEGER NOT NULL,
    "feePercent" INTEGER NOT NULL DEFAULT 10,
    "groupId" UUID,
    "respondedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supervision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionParticipant" (
    "supervisionId" UUID NOT NULL,
    "psychologistId" UUID NOT NULL,
    "status" VARCHAR(15) NOT NULL DEFAULT 'INVITED',
    "paymentStatus" VARCHAR(15) NOT NULL DEFAULT 'UNPAID',
    "stripeCheckoutSessionId" VARCHAR(100),
    "stripePaymentIntentId" VARCHAR(100),
    "amountCents" INTEGER,
    "feeCents" INTEGER,
    "paidAt" TIMESTAMP(6),

    CONSTRAINT "SupervisionParticipant_pkey" PRIMARY KEY ("supervisionId","psychologistId")
);

-- CreateIndex
CREATE INDEX "PeerGroup_type_visibility_archivedAt_idx" ON "PeerGroup"("type", "visibility", "archivedAt");

-- CreateIndex
CREATE INDEX "PeerGroup_createdById_idx" ON "PeerGroup"("createdById");

-- CreateIndex
CREATE INDEX "PeerGroupMember_psychologistId_status_idx" ON "PeerGroupMember"("psychologistId", "status");

-- CreateIndex
CREATE INDEX "CaseDiscussion_groupId_lastActivityAt_idx" ON "CaseDiscussion"("groupId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "CaseDiscussion_authorId_idx" ON "CaseDiscussion"("authorId");

-- CreateIndex
CREATE INDEX "CaseMessage_caseId_createdAt_idx" ON "CaseMessage"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseMessage_authorId_idx" ON "CaseMessage"("authorId");

-- CreateIndex
CREATE INDEX "GroupMeeting_groupId_startsAt_idx" ON "GroupMeeting"("groupId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorProfile_stripeAccountId_key" ON "SupervisorProfile"("stripeAccountId");

-- CreateIndex
CREATE INDEX "SupervisorProfile_active_idx" ON "SupervisorProfile"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Supervision_groupId_key" ON "Supervision"("groupId");

-- CreateIndex
CREATE INDEX "Supervision_supervisorId_status_idx" ON "Supervision"("supervisorId", "status");

-- CreateIndex
CREATE INDEX "Supervision_createdById_idx" ON "Supervision"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisionParticipant_stripeCheckoutSessionId_key" ON "SupervisionParticipant"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "SupervisionParticipant_psychologistId_idx" ON "SupervisionParticipant"("psychologistId");

-- CreateIndex
CREATE INDEX "Report_caseMessageId_idx" ON "Report"("caseMessageId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_caseMessageId_fkey" FOREIGN KEY ("caseMessageId") REFERENCES "CaseMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerGroup" ADD CONSTRAINT "PeerGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerGroupMember" ADD CONSTRAINT "PeerGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PeerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerGroupMember" ADD CONSTRAINT "PeerGroupMember_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "Psychologist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDiscussion" ADD CONSTRAINT "CaseDiscussion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PeerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDiscussion" ADD CONSTRAINT "CaseDiscussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Psychologist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMessage" ADD CONSTRAINT "CaseMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMeeting" ADD CONSTRAINT "GroupMeeting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PeerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMeeting" ADD CONSTRAINT "GroupMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorProfile" ADD CONSTRAINT "SupervisorProfile_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "Psychologist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supervision" ADD CONSTRAINT "Supervision_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supervision" ADD CONSTRAINT "Supervision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Psychologist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supervision" ADD CONSTRAINT "Supervision_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PeerGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionParticipant" ADD CONSTRAINT "SupervisionParticipant_supervisionId_fkey" FOREIGN KEY ("supervisionId") REFERENCES "Supervision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionParticipant" ADD CONSTRAINT "SupervisionParticipant_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "Psychologist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

