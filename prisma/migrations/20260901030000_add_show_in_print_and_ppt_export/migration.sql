-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "showInPrint" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showInPptExport" BOOLEAN NOT NULL DEFAULT true;
