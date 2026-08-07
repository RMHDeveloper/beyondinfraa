/*
  Warnings:

  - You are about to drop the column `questionId` on the `scoring_rules` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "scoring_rules" DROP COLUMN "questionId",
ADD COLUMN     "criterionKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "maxScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionLabel" TEXT NOT NULL DEFAULT '';
