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
  const { questionId, value, jsonValue } = await req.json();
  if (!questionId) return apiError("questionId required");

  // Verify project is OPEN
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { state: true },
  });
  if (!project) return apiError("Not found", 404);
  if (project.state !== "OPEN") return apiError("Project is not accepting responses", 403);

  // Verify question is not internal
  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { isInternal: true },
  });
  if (!question) return apiError("Question not found", 404);
  if (question.isInternal) return apiError("Cannot edit internal fields", 403);

  const response = await db.response.upsert({
    where: { projectId_questionId: { projectId, questionId } },
    update: {
      value: value ?? null,
      jsonValue:
        jsonValue !== undefined
          ? jsonValue === null
            ? Prisma.JsonNull
            : (jsonValue as Prisma.InputJsonValue)
          : undefined,
    },
    create: {
      projectId,
      questionId,
      value: value ?? null,
      jsonValue:
        jsonValue !== undefined
          ? jsonValue === null
            ? Prisma.JsonNull
            : (jsonValue as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });

  return Response.json(response);
}
