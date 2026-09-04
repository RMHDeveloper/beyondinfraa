import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/utils";
import { getObject } from "@/lib/storage";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await getClientSession();
  if (!session) return apiError("Unauthorized", 401);
  const { fileId } = await params;

  const customField = await db.projectCustomField.findFirst({
    where: { fileId, projectId: session.projectId, showToClient: true },
    select: { file: true },
  });
  if (!customField?.file) return apiError("Not found", 404);
  const file = customField.file;

  let buffer: Buffer;
  try {
    buffer = await getObject(file.storagePath);
  } catch {
    return apiError("File not found in storage", 404);
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName}"`,
    },
  });
}
