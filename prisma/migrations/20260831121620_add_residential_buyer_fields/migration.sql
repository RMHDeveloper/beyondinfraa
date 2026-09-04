-- AlterTable
ALTER TABLE "buyer_requirements" ADD COLUMN     "additionalContacts" JSONB,
ADD COLUMN     "brokeragePct" DOUBLE PRECISION,
ADD COLUMN     "carParksRequired" INTEGER,
ADD COLUMN     "communityPreference" TEXT,
ADD COLUMN     "directionFacing" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "floorPreference" TEXT,
ADD COLUMN     "paymentBreakup" TEXT,
ADD COLUMN     "propertyAgePreference" TEXT;
