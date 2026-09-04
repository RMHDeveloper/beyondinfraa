-- AlterTable
ALTER TABLE "client_links" ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "audit_logs_projectId_idx" ON "audit_logs"("projectId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "buyer_intake_submissions_tokenId_idx" ON "buyer_intake_submissions"("tokenId");

-- CreateIndex
CREATE INDEX "buyer_intake_tokens_categoryId_idx" ON "buyer_intake_tokens"("categoryId");

-- CreateIndex
CREATE INDEX "buyer_requirements_contactId_idx" ON "buyer_requirements"("contactId");

-- CreateIndex
CREATE INDEX "buyer_requirements_categoryId_idx" ON "buyer_requirements"("categoryId");

-- CreateIndex
CREATE INDEX "client_links_projectId_idx" ON "client_links"("projectId");

-- CreateIndex
CREATE INDEX "deals_contactId_idx" ON "deals"("contactId");

-- CreateIndex
CREATE INDEX "deals_closedById_idx" ON "deals"("closedById");

-- CreateIndex
CREATE INDEX "developer_proposal_files_developerProposalId_idx" ON "developer_proposal_files"("developerProposalId");

-- CreateIndex
CREATE INDEX "developer_proposals_developerId_idx" ON "developer_proposals"("developerId");

-- CreateIndex
CREATE INDEX "developer_proposals_projectId_idx" ON "developer_proposals"("projectId");

-- CreateIndex
CREATE INDEX "follow_ups_projectId_idx" ON "follow_ups"("projectId");

-- CreateIndex
CREATE INDEX "follow_ups_assigneeId_idx" ON "follow_ups"("assigneeId");

-- CreateIndex
CREATE INDEX "lock_entries_projectId_idx" ON "lock_entries"("projectId");

-- CreateIndex
CREATE INDEX "matches_buyerRequirementId_idx" ON "matches"("buyerRequirementId");

-- CreateIndex
CREATE INDEX "matches_tenantRequirementId_idx" ON "matches"("tenantRequirementId");

-- CreateIndex
CREATE INDEX "owner_units_projectId_idx" ON "owner_units"("projectId");

-- CreateIndex
CREATE INDEX "project_custom_fields_projectId_idx" ON "project_custom_fields"("projectId");

-- CreateIndex
CREATE INDEX "project_files_projectId_idx" ON "project_files"("projectId");

-- CreateIndex
CREATE INDEX "project_notes_projectId_idx" ON "project_notes"("projectId");

-- CreateIndex
CREATE INDEX "projects_categoryId_idx" ON "projects"("categoryId");

-- CreateIndex
CREATE INDEX "projects_subcategoryId_idx" ON "projects"("subcategoryId");

-- CreateIndex
CREATE INDEX "projects_templateId_idx" ON "projects"("templateId");

-- CreateIndex
CREATE INDEX "projects_statusId_idx" ON "projects"("statusId");

-- CreateIndex
CREATE INDEX "projects_assigneeId_idx" ON "projects"("assigneeId");

-- CreateIndex
CREATE INDEX "projects_referredById_idx" ON "projects"("referredById");

-- CreateIndex
CREATE INDEX "projects_clientContactId_idx" ON "projects"("clientContactId");

-- CreateIndex
CREATE INDEX "proposal_files_proposalId_idx" ON "proposal_files"("proposalId");

-- CreateIndex
CREATE INDEX "proposal_properties_projectId_idx" ON "proposal_properties"("projectId");

-- CreateIndex
CREATE INDEX "proposals_contactId_idx" ON "proposals"("contactId");

-- CreateIndex
CREATE INDEX "proposals_buyerRequirementId_idx" ON "proposals"("buyerRequirementId");

-- CreateIndex
CREATE INDEX "proposals_tenantRequirementId_idx" ON "proposals"("tenantRequirementId");

-- CreateIndex
CREATE INDEX "proposals_demandProjectId_idx" ON "proposals"("demandProjectId");

-- CreateIndex
CREATE INDEX "questions_groupId_idx" ON "questions"("groupId");

-- CreateIndex
CREATE INDEX "requirement_custom_fields_buyerRequirementId_idx" ON "requirement_custom_fields"("buyerRequirementId");

-- CreateIndex
CREATE INDEX "requirement_custom_fields_tenantRequirementId_idx" ON "requirement_custom_fields"("tenantRequirementId");

-- CreateIndex
CREATE INDEX "responses_questionId_idx" ON "responses"("questionId");

-- CreateIndex
CREATE INDEX "site_visits_projectId_idx" ON "site_visits"("projectId");

-- CreateIndex
CREATE INDEX "site_visits_contactId_idx" ON "site_visits"("contactId");

-- CreateIndex
CREATE INDEX "site_visits_proposalId_idx" ON "site_visits"("proposalId");

-- CreateIndex
CREATE INDEX "site_visits_categoryId_idx" ON "site_visits"("categoryId");

-- CreateIndex
CREATE INDEX "site_visits_managedById_idx" ON "site_visits"("managedById");

-- CreateIndex
CREATE INDEX "template_groups_groupId_idx" ON "template_groups"("groupId");

-- CreateIndex
CREATE INDEX "templates_subcategoryId_idx" ON "templates"("subcategoryId");

-- CreateIndex
CREATE INDEX "tenant_intake_submissions_tokenId_idx" ON "tenant_intake_submissions"("tokenId");

-- CreateIndex
CREATE INDEX "tenant_intake_tokens_categoryId_idx" ON "tenant_intake_tokens"("categoryId");

-- CreateIndex
CREATE INDEX "tenant_requirements_contactId_idx" ON "tenant_requirements"("contactId");

-- CreateIndex
CREATE INDEX "tenant_requirements_categoryId_idx" ON "tenant_requirements"("categoryId");
