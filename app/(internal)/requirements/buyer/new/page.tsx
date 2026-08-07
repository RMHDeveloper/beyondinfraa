import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import RequirementForm from "../../RequirementForm";

export default async function NewBuyerRequirementPage({ searchParams }: { searchParams: Promise<{ contactId?: string }> }) {
  const { contactId: defaultContactId } = await searchParams;
  const [contacts, categories] = await Promise.all([
    db.contact.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  async function createBuyerReq(formData: FormData) {
    "use server";
    const contactId  = formData.get("contactId") as string;
    const categoryId = formData.get("categoryId") as string;
    if (!contactId || !categoryId) return;

    const count = await db.buyerRequirement.count();
    const reqNumber = `BR-${String(count + 1).padStart(4, "0")}`;

    await db.buyerRequirement.create({
      data: {
        reqNumber,
        contactId,
        categoryId,
        budgetMin:          parseFloat(formData.get("budgetMin") as string) || null,
        budgetMax:          parseFloat(formData.get("budgetMax") as string) || null,
        areaMin:            parseFloat(formData.get("areaMin") as string) || null,
        areaMax:            parseFloat(formData.get("areaMax") as string) || null,
        bhk:               (formData.get("bhk") as string) || null,
        propertySubtype:   (formData.get("propertySubtype") as string) || null,
        furnishing:        (formData.get("furnishing") as string) || null,
        timeline:          (formData.get("timeline") as string) || null,
        priority:          (formData.get("priority") as string) || "Medium",
        notes:             (formData.get("notes") as string) || null,
      },
    });
    redirect("/projects?tab=Buyer+Requirements");
  }

  return (
    <RequirementForm
      type="buyer"
      contacts={contacts}
      categories={categories}
      action={createBuyerReq}
      defaultContactId={defaultContactId}
    />
  );
}
