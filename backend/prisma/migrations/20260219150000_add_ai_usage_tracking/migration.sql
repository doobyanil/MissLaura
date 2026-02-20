-- Add AI token quota fields to SubscriptionPlan
ALTER TABLE "SubscriptionPlan" ADD COLUMN "maxAiTokensPerMonth" INTEGER NOT NULL DEFAULT 100000;

-- Add billing period fields to Subscription
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodStart" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "overrideMaxAiTokens" INTEGER;

-- CreateTable: AiUsageLog for detailed token tracking
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(10,6),
    "requestId" TEXT,
    "worksheetId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for AiUsageLog
CREATE INDEX "AiUsageLog_schoolId_createdAt_idx" ON "AiUsageLog"("schoolId", "createdAt");
CREATE INDEX "AiUsageLog_userId_createdAt_idx" ON "AiUsageLog"("userId", "createdAt");
CREATE INDEX "AiUsageLog_feature_createdAt_idx" ON "AiUsageLog"("feature", "createdAt");
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");
