-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'IMAGE');

-- AlterTable
ALTER TABLE "project_custom_fields" ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "type" "CustomFieldType" NOT NULL DEFAULT 'TEXT';

-- CreateIndex
CREATE UNIQUE INDEX "project_custom_fields_fileId_key" ON "project_custom_fields"("fileId");

-- AddForeignKey
ALTER TABLE "project_custom_fields" ADD CONSTRAINT "project_custom_fields_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "project_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
