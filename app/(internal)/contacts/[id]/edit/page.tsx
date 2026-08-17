import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import EditContactForm from "./EditContactForm";

export const dynamic = "force-dynamic";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await db.contact.findUnique({ where: { id }, include: { developerProfile: true } });
  if (!contact) notFound();

  async function updateContact(formData: FormData) {
    "use server";
    const name     = (formData.get("name") as string).trim();
    const type     = formData.get("type") as string;
    const phone    = (formData.get("phone") as string).trim() || null;
    const email    = (formData.get("email") as string).trim() || null;
    const company  = (formData.get("company") as string).trim() || null;
    const notes    = (formData.get("notes") as string).trim() || null;
    const isActive = formData.get("isActive") === "true";
    if (!name) return;
    await db.contact.update({ where: { id }, data: { name, type: type as any, phone, email, company, notes, isActive } });

    if (type === "DEVELOPER") {
      const reraNumber = (formData.get("reraNumber") as string)?.trim() || null;
      const preferredProjectSize = (formData.get("preferredProjectSize") as string)?.trim() || null;
      const preferredLocationsRaw = (formData.get("preferredLocations") as string)?.trim() || "";
      const financialCapability = (formData.get("financialCapability") as string)?.trim() || null;
      const completedProjects = parseInt(formData.get("completedProjects") as string) || 0;
      const ongoingProjects = parseInt(formData.get("ongoingProjects") as string) || 0;
      const internalRating = parseInt(formData.get("internalRating") as string) || null;
      const preferredLocations = preferredLocationsRaw
        ? preferredLocationsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      await db.developer.upsert({
        where: { contactId: id },
        create: { contactId: id, reraNumber, preferredProjectSize, preferredLocations, financialCapability, completedProjects, ongoingProjects, internalRating },
        update: { reraNumber, preferredProjectSize, preferredLocations, financialCapability, completedProjects, ongoingProjects, internalRating },
      });
    }

    redirect(`/contacts/${id}`);
  }

  return <EditContactForm contact={contact} developerProfile={contact.developerProfile} action={updateContact} />;
}
