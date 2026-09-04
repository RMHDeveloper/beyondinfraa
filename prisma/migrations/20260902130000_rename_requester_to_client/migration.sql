-- RenameColumn (preserves existing data)
ALTER TABLE "projects" RENAME COLUMN "requesterContactId" TO "clientContactId";

-- RenameForeignKeyConstraint (keeps naming consistent with Prisma's expected default)
ALTER TABLE "projects" RENAME CONSTRAINT "projects_requesterContactId_fkey" TO "projects_clientContactId_fkey";
