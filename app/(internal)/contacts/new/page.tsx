import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import NewContactForm from "./NewContactForm";

export default function NewContactPage() {
  async function createContact(formData: FormData) {
    "use server";
    const name    = (formData.get("name") as string).trim();
    const type    = formData.get("type") as string;
    const phone   = (formData.get("phone") as string).trim() || null;
    const email   = (formData.get("email") as string).trim() || null;
    const company = (formData.get("company") as string).trim() || null;
    const notes   = (formData.get("notes") as string).trim() || null;
    if (!name) return;
    const contact = await db.contact.create({ data: { name, type: type as any, phone, email, company, notes } });

    if (type === "DEVELOPER") {
      const reraNumber = (formData.get("reraNumber") as string)?.trim() || null;
      const preferredProjectSize = (formData.get("preferredProjectSize") as string)?.trim() || null;
      const preferredLocationsRaw = (formData.get("preferredLocations") as string)?.trim() || "";
      const financialCapability = (formData.get("financialCapability") as string)?.trim() || null;
      const completedProjects = parseInt(formData.get("completedProjects") as string) || 0;
      const ongoingProjects = parseInt(formData.get("ongoingProjects") as string) || 0;
      const internalRating = parseInt(formData.get("internalRating") as string) || null;
      await db.developer.create({
        data: {
          contactId: contact.id,
          reraNumber,
          preferredProjectSize,
          preferredLocations: preferredLocationsRaw
            ? preferredLocationsRaw.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
          financialCapability,
          completedProjects,
          ongoingProjects,
          internalRating,
        },
      });
    }

    redirect("/contacts");
  }

  return <NewContactForm action={createContact} />;
}
