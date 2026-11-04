-- Indici sulle chiavi esterne e sui campi usati nei filtri/ordinamenti (solo CREATE INDEX, nessun dato modificato)
-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_emailVerificationToken_idx" ON "User"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "Psychologist_verified_subscriptionActive_idx" ON "Psychologist"("verified", "subscriptionActive");

-- CreateIndex
CREATE INDEX "Psychologist_stripeCustomerId_idx" ON "Psychologist"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "PsychologistAddress_psychologistId_idx" ON "PsychologistAddress"("psychologistId");

-- CreateIndex
CREATE INDEX "Question_userId_idx" ON "Question"("userId");

-- CreateIndex
CREATE INDEX "Question_createdAt_idx" ON "Question"("createdAt");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "Answer_psychologistId_idx" ON "Answer"("psychologistId");

-- CreateIndex
CREATE INDEX "Conversation_userId_psychologistId_idx" ON "Conversation"("userId", "psychologistId");

-- CreateIndex
CREATE INDEX "Conversation_psychologistId_idx" ON "Conversation"("psychologistId");

-- CreateIndex
CREATE INDEX "Conversation_firstQuestionId_idx" ON "Conversation"("firstQuestionId");

-- CreateIndex
CREATE INDEX "Conversation_firstAnswerId_idx" ON "Conversation"("firstAnswerId");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderUserId_idx" ON "Message"("senderUserId");

-- CreateIndex
CREATE INDEX "Message_senderPsychId_idx" ON "Message"("senderPsychId");

-- CreateIndex
CREATE INDEX "Appointment_psychologistId_startTime_idx" ON "Appointment"("psychologistId", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_userId_startTime_idx" ON "Appointment"("userId", "startTime");

-- CreateIndex
CREATE INDEX "Post_psychologistId_createdAt_idx" ON "Post"("psychologistId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_psychologistId_idx" ON "Review"("psychologistId");

-- CreateIndex
CREATE INDEX "Report_reporterUserId_conversationId_idx" ON "Report"("reporterUserId", "conversationId");

-- CreateIndex
CREATE INDEX "Report_conversationId_idx" ON "Report"("conversationId");

