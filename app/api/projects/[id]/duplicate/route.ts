import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const source = await db.project.findUnique({
    where: { id },
    include: {
      category: true,
      responses: true,
      customFields: true,
    },
  });
  if (!source) return Response.json({ error: "Not found" }, { status: 404 });

  const count = await db.project.count();
  const projectNumber = `BI-${source.category.slug.slice(0, 3).toUpperCase()}-${String(count + 1).padStart(4, "0")}`;

  const defaultStatus = await db.status.findFirst({ where: { slug: "new" } });

  const project = await db.project.create({
    data: {
      projectNumber,
      title: `${source.title} (Copy)`,
      categoryId: source.categoryId,
      subcategoryId: source.subcategoryId,
      templateId: source.templateId,
      templateVersion: source.templateVersion,
      statusId: defaultStatus?.id ?? null,
      assigneeId: session.role === "EMPLOYEE" ? session.id : null,
      clientName: source.clientName,
      clientPhone: source.clientPhone,
      clientEmail: source.clientEmail,
      leadSource: source.leadSource,
      leadDate: source.leadDate,
    },
  });

  if (source.responses.length > 0) {
    await db.response.createMany({
      data: source.responses.map((r) => ({
        projectId: project.id,
        questionId: r.questionId,
        value: r.value,
        jsonValue: r.jsonValue ?? undefined,
      })),
    });
  }

  if (source.customFields.length > 0) {
    await db.projectCustomField.createMany({
      data: source.customFields.map((f) => ({
        projectId: project.id,
        label: f.label,
        value: f.value,
        sortOrder: f.sortOrder,
      })),
    });
  }

  await db.auditLog.create({
    data: {
      projectId: project.id,
      userId: session.id,
      action: "CREATE",
      entityType: "project",
      entityId: project.id,
      after: { projectNumber, title: project.title, duplicatedFrom: source.projectNumber },
    },
  });

  return Response.json(project, { status: 201 });
}
