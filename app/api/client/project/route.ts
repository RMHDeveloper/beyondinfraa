import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify client session
  const cookieStore = await cookies();
  const clientToken = cookieStore.get("bi_client_token")?.value;
  if (!clientToken) return apiError("Unauthorized", 401);

  let session: { projectId: string };
  try {
    session = jwt.verify(clientToken, process.env.JWT_SECRET!) as { projectId: string };
  } catch {
    return apiError("Unauthorized", 401);
  }

  // Also allow token param for initial check before cookie set
  const urlToken = req.nextUrl.searchParams.get("token");
  if (urlToken) {
    const link = await db.clientLink.findUnique({ where: { token: urlToken } });
    if (!link || !link.isActive) return apiError("Invalid link", 404);
    // After OTP, the session projectId will match
  }

  const project = await db.project.findUnique({
    where: { id: session.projectId },
    select: {
      id: true, projectNumber: true, title: true, state: true,
      clientName: true, clientPhone: true,
      category:    { select: { id: true, name: true } },
      subcategory: { select: { id: true, name: true } },
      template: {
        select: {
          id: true, name: true,
          groups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, sortOrder: true,
              group: {
                select: {
                  id: true, name: true,
                  questions: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      id: true, label: true, fieldType: true, isRequired: true,
                      isInternal: true, options: true, unit: true, helpText: true,
                      conditionalJson: true, autoCalcJson: true, sortOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: { select: { questionId: true, value: true, jsonValue: true } },
    },
  });

  if (!project) return apiError("Not found", 404);
  return Response.json(project);
}
