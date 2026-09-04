-- AlterTable
ALTER TABLE "client_links" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "client_links_slug_key" ON "client_links"("slug");
