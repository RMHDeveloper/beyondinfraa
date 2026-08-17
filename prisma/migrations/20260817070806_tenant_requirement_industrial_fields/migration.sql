-- AlterTable
ALTER TABLE "tenant_requirements" ADD COLUMN     "additionalContacts" JSONB,
ADD COLUMN     "brokeragePct" DOUBLE PRECISION,
ADD COLUMN     "carParksRequired" INTEGER,
ADD COLUMN     "directionFacing" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "facilityGrade" TEXT,
ADD COLUMN     "floorPreference" TEXT,
ADD COLUMN     "flooringType" TEXT,
ADD COLUMN     "paymentBreakup" TEXT,
ADD COLUMN     "powerConnectionLevel" TEXT,
ADD COLUMN     "propertyAgePreference" TEXT,
ADD COLUMN     "propertySharing" TEXT;
