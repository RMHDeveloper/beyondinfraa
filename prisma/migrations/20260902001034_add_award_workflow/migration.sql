-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'AWARD';

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "matchId" TEXT,
ADD COLUMN     "developerProposalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "deals_matchId_key" ON "deals"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "deals_developerProposalId_key" ON "deals"("developerProposalId");

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_developerProposalId_fkey" FOREIGN KEY ("developerProposalId") REFERENCES "developer_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
