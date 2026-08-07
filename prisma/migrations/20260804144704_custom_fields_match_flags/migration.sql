-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "project_custom_fields" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_custom_fields" (
    "id" TEXT NOT NULL,
    "buyerRequirementId" TEXT,
    "tenantRequirementId" TEXT,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_custom_fields_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "project_custom_fields" ADD CONSTRAINT "project_custom_fields_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_custom_fields" ADD CONSTRAINT "requirement_custom_fields_buyerRequirementId_fkey" FOREIGN KEY ("buyerRequirementId") REFERENCES "buyer_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_custom_fields" ADD CONSTRAINT "requirement_custom_fields_tenantRequirementId_fkey" FOREIGN KEY ("tenantRequirementId") REFERENCES "tenant_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
