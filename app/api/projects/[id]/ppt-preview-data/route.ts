import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, withErrorHandling } from "@/lib/utils";

// GET — the field-group/response/config data needed to render an accurate PPT slide
// preview for one property, used by the bulk export modal (which only has id/title/
// projectNumber for each selected property up front).
export const GET = withErrorHandling(async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    select: {
      pptExportConfig: true,
      template: {
        select: {
          groups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, sortOrder: true,
              group: {
                select: {
                  id: true, name: true,
                  questions: {
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, label: true, fieldType: true, isInternal: true, isRequired: true, showInPptExport: true },
                  },
                },
              },
            },
          },
        },
      },
      responses: { select: { questionId: true, value: true } },
    },
  });
  if (!project) return apiError("Not found", 404);

  return Response.json({
    templateGroups: project.template.groups,
    responseMap: Object.fromEntries(project.responses.map((r) => [r.questionId, r.value ?? ""])),
    pptExportConfig: project.pptExportConfig,
  });
});
