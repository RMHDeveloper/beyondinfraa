import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true, projectNumber: true, title: true, state: true, createdAt: true,
      clientName: true, clientPhone: true, leadSource: true, leadDate: true,
      category:    { select: { id: true, name: true, slug: true } },
      subcategory: { select: { id: true, name: true } },
      status:      { select: { id: true, name: true, color: true } },
      assignee:    { select: { name: true } },
    },
  });
  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const {
    categoryId, subcategoryId, templateId, templateVersion, title, clientName, clientPhone, clientEmail, leadSource, leadDate,
    referredById, newReferrerName, newReferrerPhone,
  } = await req.json();

  if (!categoryId || !subcategoryId || !templateId || !title) {
    return apiError("categoryId, subcategoryId, templateId, title required");
  }

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) return apiError("Category not found", 404);

  let resolvedReferrerId: string | null = referredById ?? null;
  if (!resolvedReferrerId && newReferrerName) {
    const existing = newReferrerPhone ? await db.contact.findFirst({ where: { phone: newReferrerPhone } }) : null;
    const referrer = existing ?? await db.contact.create({
      data: { name: newReferrerName, phone: newReferrerPhone || null, type: "OTHER" },
    });
    resolvedReferrerId = referrer.id;
  }

  // Generate project number
  const count = await db.project.count();
  const projectNumber = `BI-${category.slug.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(4, "0")}`;

  const defaultStatus = await db.status.findFirst({ where: { slug: "new" } });

  const project = await db.project.create({
    data: {
      projectNumber,
      title,
      categoryId,
      subcategoryId,
      templateId,
      templateVersion: templateVersion ?? 1,
      statusId: defaultStatus?.id ?? null,
      assigneeId: session.role === "EMPLOYEE" ? session.id : null,
      clientName: clientName ?? null,
      clientPhone: clientPhone ?? null,
      clientEmail: clientEmail ?? null,
      leadSource: leadSource ?? null,
      leadDate: leadDate ? new Date(leadDate) : null,
      referredById: resolvedReferrerId,
    },
  });

  await db.auditLog.create({
    data: {
      projectId: project.id,
      userId: session.id,
      action: "CREATE",
      entityType: "project",
      entityId: project.id,
      after: { projectNumber, title, categoryId, subcategoryId },
    },
  });

  return Response.json(project, { status: 201 });
}
