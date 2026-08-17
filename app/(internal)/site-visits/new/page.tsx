import { redirect } from "next/navigation";
import type { SiteVisitSegment } from "@prisma/client";
import { db } from "@/lib/db";
import SiteVisitForm from "./SiteVisitForm";

export const dynamic = "force-dynamic";

export default async function NewSiteVisitPage() {
  const [contacts, projects, categories] = await Promise.all([
    db.contact.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    db.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, projectNumber: true, category: true },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  async function createVisit(formData: FormData) {
    "use server";
    const projectId = (formData.get("projectId") as string) || null;
    const contactId = (formData.get("contactId") as string) || null;
    const dateStr   = formData.get("scheduledAt") as string;

    const count = await db.siteVisit.count();
    const visitNumber = `SV-${String(count + 1).padStart(4, "0")}`;

    await db.siteVisit.create({
      data: {
        visitNumber,
        projectId,
        contactId,
        scheduledAt: dateStr ? new Date(dateStr) : new Date(),
        categoryId: (formData.get("categoryId") as string) || null,
        segment:    (formData.get("segment") as SiteVisitSegment) || null,
        mapsLink:   (formData.get("mapsLink") as string) || null,
        location:  (formData.get("location") as string) || null,
        notes:     (formData.get("notes") as string) || null,
      },
    });
    redirect("/projects?tab=Site+Visits");
  }

  return <SiteVisitForm contacts={contacts} projects={projects as any} categories={categories} action={createVisit} />;
}
