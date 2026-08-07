import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SiteVisitForm from "./SiteVisitForm";

export const dynamic = "force-dynamic";

export default async function NewSiteVisitPage() {
  const [contacts, projects] = await Promise.all([
    db.contact.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    db.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, projectNumber: true, category: true },
    }),
  ]);

  async function createVisit(formData: FormData) {
    "use server";
    const projectId = formData.get("projectId") as string;
    const contactId = formData.get("contactId") as string;
    const dateStr   = formData.get("scheduledAt") as string;
    if (!projectId || !contactId || !dateStr) return;

    const count = await db.siteVisit.count();
    const visitNumber = `SV-${String(count + 1).padStart(4, "0")}`;

    await db.siteVisit.create({
      data: {
        visitNumber,
        projectId,
        contactId,
        scheduledAt: new Date(dateStr),
        location:  (formData.get("location") as string) || null,
        notes:     (formData.get("notes") as string) || null,
      },
    });
    redirect("/projects?tab=Site+Visits");
  }

  return <SiteVisitForm contacts={contacts} projects={projects as any} action={createVisit} />;
}
