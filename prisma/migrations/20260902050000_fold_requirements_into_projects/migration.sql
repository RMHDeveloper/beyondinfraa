-- AlterTable
ALTER TABLE "projects" ADD COLUMN "requesterContactId" TEXT;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN "demandProjectId" TEXT;

-- AlterTable
ALTER TABLE "proposals" ADD COLUMN "demandProjectId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "matches_demandProjectId_key" ON "matches"("demandProjectId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_requesterContactId_fkey" FOREIGN KEY ("requesterContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_demandProjectId_fkey" FOREIGN KEY ("demandProjectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_demandProjectId_fkey" FOREIGN KEY ("demandProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
