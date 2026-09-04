import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, withErrorHandling } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async function GET() {
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
});

export const POST = withErrorHandling(async function POST(req: NextRequest) {
  const session = await requireSession();
  const {
    categoryId, subcategoryId, templateId, templateVersion, title, clientName, clientPhone, clientEmail, leadSource, leadDate,
    referredById, newReferrerName, newReferrerPhone,
    clientContactId, newClientContactName, newClientContactPhone,
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

  let resolvedClientContactId: string | null = clientContactId ?? null;
  if (!resolvedClientContactId && newClientContactName) {
    const existing = newClientContactPhone ? await db.contact.findFirst({ where: { phone: newClientContactPhone } }) : null;
    const client = existing ?? await db.contact.create({
      data: { name: newClientContactName, phone: newClientContactPhone || null, type: "OTHER" },
    });
    resolvedClientContactId = client.id;
  }
  // Sell/Rent (and any other non-demand subcategory) projects collect the client via the
  // plain clientName/clientPhone fields rather than the contact picker used for Buy/Tenant —
  // link/create the same Contact record here so these clients also show up in Contacts.
  // They're the owner of the property being listed, so tag them OWNER.
  if (!resolvedClientContactId && clientName) {
    const existing = clientPhone ? await db.contact.findFirst({ where: { phone: clientPhone } }) : null;
    const client = existing ?? await db.contact.create({
      data: { name: clientName, phone: clientPhone || null, email: clientEmail || null, type: "OWNER" },
    });
    resolvedClientContactId = client.id;
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
      clientContactId: resolvedClientContactId,
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

  // Prefill "Client Profile" template questions from the client details entered above,
  // so the info isn't typed twice into two separate places for the same project.
  const clientFieldMap: Record<string, string | null> = {
    "Primary Contact Name": clientName ?? null,
    "Primary Owner Name": clientName ?? null,
    "Primary Contact Phone": clientPhone ?? null,
    "Primary Contact Email": clientEmail ?? null,
  };
  const prefillLabels = Object.keys(clientFieldMap);
  const templateQuestions = await db.question.findMany({
    where: { label: { in: prefillLabels }, group: { templates: { some: { templateId } } } },
    select: { id: true, label: true },
  });
  const prefillRows = templateQuestions
    .map((q) => ({ questionId: q.id, value: clientFieldMap[q.label] }))
    .filter((r): r is { questionId: string; value: string } => !!r.value?.trim());
  if (prefillRows.length) {
    await db.response.createMany({
      data: prefillRows.map((r) => ({ projectId: project.id, questionId: r.questionId, value: r.value })),
    });
  }

  return Response.json(project, { status: 201 });
});
