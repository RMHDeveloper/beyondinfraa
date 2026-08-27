/*
  Warnings:

  - You are about to drop the `negotiation_rounds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `negotiations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "negotiation_rounds" DROP CONSTRAINT "negotiation_rounds_negotiationId_fkey";

-- DropForeignKey
ALTER TABLE "negotiations" DROP CONSTRAINT "negotiations_contactId_fkey";

-- DropForeignKey
ALTER TABLE "negotiations" DROP CONSTRAINT "negotiations_projectId_fkey";

-- DropForeignKey
ALTER TABLE "negotiations" DROP CONSTRAINT "negotiations_proposalId_fkey";

-- DropTable
DROP TABLE "negotiation_rounds";

-- DropTable
DROP TABLE "negotiations";

-- DropEnum
DROP TYPE "NegotiationStatus";
