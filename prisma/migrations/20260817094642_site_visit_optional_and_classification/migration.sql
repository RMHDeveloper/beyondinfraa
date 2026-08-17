-- CreateEnum
CREATE TYPE "SiteVisitSegment" AS ENUM ('BUY', 'SELL', 'RENT', 'REDEVELOPMENT', 'JV');

-- DropForeignKey
ALTER TABLE "site_visits" DROP CONSTRAINT "site_visits_contactId_fkey";

-- DropForeignKey
ALTER TABLE "site_visits" DROP CONSTRAINT "site_visits_projectId_fkey";

-- AlterTable
ALTER TABLE "site_visits" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "mapsLink" TEXT,
ADD COLUMN     "segment" "SiteVisitSegment",
ALTER COLUMN "projectId" DROP NOT NULL,
ALTER COLUMN "contactId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
