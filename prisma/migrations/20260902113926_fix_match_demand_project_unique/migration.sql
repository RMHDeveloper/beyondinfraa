-- DropIndex
DROP INDEX "matches_demandProjectId_key";

-- CreateIndex
CREATE UNIQUE INDEX "matches_projectId_demandProjectId_key" ON "matches"("projectId", "demandProjectId");
