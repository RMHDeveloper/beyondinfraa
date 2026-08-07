import { db } from "@/lib/db";

export async function GET() {
  const templates = await db.template.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, version: true,
      subcategory: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
      groups: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, sortOrder: true,
          group: {
            select: {
              id: true, name: true, isShared: true,
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
  });
  return Response.json(templates);
}
