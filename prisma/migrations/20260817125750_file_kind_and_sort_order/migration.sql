-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('DOCUMENT', 'GALLERY_IMAGE');

-- AlterTable
ALTER TABLE "project_files" ADD COLUMN     "kind" "FileKind" NOT NULL DEFAULT 'DOCUMENT',
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
