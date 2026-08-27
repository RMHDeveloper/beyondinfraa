-- CreateTable
CREATE TABLE "developer_proposal_files" (
    "id" TEXT NOT NULL,
    "developerProposalId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_proposal_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "developer_proposal_files" ADD CONSTRAINT "developer_proposal_files_developerProposalId_fkey" FOREIGN KEY ("developerProposalId") REFERENCES "developer_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
