import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getClientSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bi_client_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as {
      clientLinkId: string;
      projectId: string;
    };
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getClientSession();
  if (!session) return apiError("Unauthorized", 401);

  const { projectId } = session;
  const { questionId: id, value } = await req.json();
  if (!id) return apiError("id required");

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { state: true },
  });
  if (!project) return apiError("Not found", 404);
  if (project.state !== "OPEN") return apiError("Project is not accepting responses", 403);

  const field = await db.projectCustomField.findUnique({ where: { id } });
  if (!field || field.projectId !== projectId) return apiError("Not found", 404);
  if (!field.showToClient) return apiError("Cannot edit this field", 403);
  if (field.type !== "TEXT") return apiError("Cannot edit this field", 403);

  const beforeValue = field.value;
  const afterValue = value?.trim() || null;

  const updated = await db.projectCustomField.update({
    where: { id },
    data: { value: afterValue },
  });

  if (beforeValue !== afterValue) {
    await db.auditLog.create({
      data: {
        projectId,
        action: "UPDATE",
        entityType: "custom_field",
        entityId: id,
        meta: { label: field.label, before: beforeValue, after: afterValue, source: "client" } as Prisma.InputJsonValue,
      },
    });
  }

  return Response.json(updated);
}
