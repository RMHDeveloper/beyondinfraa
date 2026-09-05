-- CreateTable
CREATE TABLE "developer_files" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "developer_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "developer_files_developerId_idx" ON "developer_files"("developerId");

-- AddForeignKey
ALTER TABLE "developer_files" ADD CONSTRAINT "developer_files_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
