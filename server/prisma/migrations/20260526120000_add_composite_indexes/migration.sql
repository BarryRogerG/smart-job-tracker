-- DropIndex
DROP INDEX "Job_userId_idx";

-- DropIndex
DROP INDEX "StatusHistory_jobId_idx";

-- CreateIndex
CREATE INDEX "Job_userId_appliedDate_idx" ON "Job"("userId", "appliedDate");

-- CreateIndex
CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");

-- CreateIndex
CREATE INDEX "StatusHistory_jobId_changedAt_idx" ON "StatusHistory"("jobId", "changedAt");
