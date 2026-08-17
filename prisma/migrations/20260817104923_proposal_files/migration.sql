-- CreateTable
CREATE TABLE "proposal_files" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "proposal_files" ADD CONSTRAINT "proposal_files_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
