import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import RequirementForm from "../../RequirementForm";

export default async function NewTenantRequirementPage({ searchParams }: { searchParams: Promise<{ contactId?: string }> }) {
  const { contactId: defaultContactId } = await searchParams;
  const [contacts, categories] = await Promise.all([
    db.contact.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  async function createTenantReq(formData: FormData) {
    "use server";
    let contactId    = formData.get("contactId") as string;
    const categoryId = formData.get("categoryId") as string;
    if (!contactId || !categoryId) return;

    if (contactId === "__new__") {
      const name  = (formData.get("newContactName") as string)?.trim();
      const phone = (formData.get("newContactPhone") as string)?.trim();
      const email = (formData.get("newContactEmail") as string)?.trim() || null;
      if (!name || !phone) return;
      const existing = await db.contact.findFirst({ where: { phone } });
      const contact = existing ?? await db.contact.create({ data: { name, phone, email, type: "TENANT" } });
      contactId = contact.id;
    }

    const count = await db.tenantRequirement.count();
    const reqNumber = `TR-${String(count + 1).padStart(4, "0")}`;

    await db.tenantRequirement.create({
      data: {
        reqNumber,
        contactId,
        categoryId,
        rentMin:          parseFloat(formData.get("rentMin") as string) || null,
        rentMax:          parseFloat(formData.get("rentMax") as string) || null,
        depositBudget:    parseFloat(formData.get("depositBudget") as string) || null,
        areaMin:          parseFloat(formData.get("areaMin") as string) || null,
        areaMax:          parseFloat(formData.get("areaMax") as string) || null,
        leaseDuration:    parseInt(formData.get("leaseDuration") as string) || null,
        lockInPeriod:     parseInt(formData.get("lockInPeriod") as string) || null,
        propertySubtype:  (formData.get("propertySubtype") as string) || null,
        furnishing:       (formData.get("furnishing") as string) || null,
        operationalReqs:  (formData.get("operationalReqs") as string) || null,
        priority:         (formData.get("priority") as string) || "Medium",
        notes:            (formData.get("notes") as string) || null,
      },
    });
    redirect("/projects?tab=Tenant+Requirements");
  }

  return (
    <RequirementForm
      type="tenant"
      contacts={contacts}
      categories={categories}
      action={createTenantReq}
      defaultContactId={defaultContactId}
    />
  );
}
