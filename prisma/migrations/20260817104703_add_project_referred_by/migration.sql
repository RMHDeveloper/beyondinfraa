-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "referredById" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
