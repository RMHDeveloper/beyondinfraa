import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NewProposalForm from "./NewProposalForm";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const [contacts, buyerReqs, tenantReqs, projects] = await Promise.all([
    db.contact.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    db.buyerRequirement.findMany({
      where: { status: { in: ["NEW", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, reqNumber: true, status: true,
        budgetMin: true, budgetMax: true,
        contact:  { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    db.tenantRequirement.findMany({
      where: { status: { in: ["NEW", "ACTIVE"] } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true, reqNumber: true, status: true,
        rentMin: true, rentMax: true,
        contact:  { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    db.project.findMany({
      where: { state: "OPEN" },
      orderBy: { title: "asc" },
      take: 500,
      select: { id: true, title: true, projectNumber: true, category: { select: { id: true, name: true } } },
    }),
  ]);

  async function createProposal(formData: FormData) {
    "use server";
    const contactId          = formData.get("contactId") as string;
    const buyerRequirementId = (formData.get("buyerRequirementId") as string) || null;
    const tenantRequirementId= (formData.get("tenantRequirementId") as string) || null;
    const projectIds         = formData.getAll("projectIds") as string[];
    const introduction       = (formData.get("introduction") as string) || null;
    const remarks            = (formData.get("remarks") as string) || null;

    if (!contactId || projectIds.length === 0) return;

    const count = await db.proposal.count();
    const proposalNumber = `PRP-${String(count + 1).padStart(4, "0")}`;

    const proposal = await db.proposal.create({
      data: {
        proposalNumber,
        contactId,
        buyerRequirementId,
        tenantRequirementId,
        introduction,
        remarks,
        items: {
          create: projectIds.map((pid, i) => ({ projectId: pid, sortOrder: i })),
        },
      },
    });

    redirect(`/projects?tab=Proposals`);
  }

  return (
    <NewProposalForm
      contacts={contacts}
      buyerReqs={buyerReqs as any}
      tenantReqs={tenantReqs as any}
      projects={projects as any}
      action={createProposal}
    />
  );
}
