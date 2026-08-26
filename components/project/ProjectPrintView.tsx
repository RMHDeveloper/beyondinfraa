type Question = { id: string; label: string; sortOrder: number };
type Group = { id: string; name: string; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type Project = {
  projectNumber: string; title: string;
  category: { name: string }; subcategory: { name: string };
  template: { groups: TemplateGroup[] };
};

function findGroup(project: Project, ...names: string[]): Group | null {
  const lower = names.map((n) => n.toLowerCase());
  const tg = project.template.groups.find((tg) => lower.includes(tg.group.name.toLowerCase()));
  return tg?.group ?? null;
}

function FieldTable({ title, group, values }: { title: string; group: Group | null; values: Record<string, string> }) {
  const rows = (group?.questions ?? [])
    .slice().sort((a, b) => a.sortOrder - b.sortOrder)
    .map((q) => ({ label: q.label, value: values[q.id]?.trim() || "—" }));

  return (
    <div className="border border-gray-400">
      <div className="bg-gray-900 text-white text-xs font-bold text-center py-1.5">{title}</div>
      <table className="w-full text-xs">
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="px-2 py-2 text-gray-400 italic">No data captured.</td></tr>
          ) : rows.map((r) => (
            <tr key={r.label} className="border-t border-gray-300">
              <td className="px-2 py-1.5 font-medium text-gray-700 w-1/2 align-top">{r.label}</td>
              <td className="px-2 py-1.5 text-gray-900 align-top">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjectPrintView({
  project, localValues, photoUrl,
}: { project: Project; localValues: Record<string, string>; photoUrl: string | null }) {
  const developmentDetails = findGroup(project, "Development Details");
  const areaAvailability = findGroup(project, "Area / Availability", "Area/Availability");
  const commercialDetails = findGroup(project, "Commercial Details", "Rental Details");
  const tenantProfile = findGroup(project, "Tenant Profile");

  return (
    <div className="print-area hidden p-8 text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>
      <div className="flex items-baseline justify-between border-b-2 border-gray-900 pb-2 mb-4">
        <div>
          <h1 className="text-lg font-bold">{project.title}</h1>
          <p className="text-xs text-gray-500">{project.projectNumber} · {project.category.name} · {project.subcategory.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <FieldTable title="Development Details / Offered Building Details" group={developmentDetails} values={localValues} />
        {photoUrl ? (
          <img src={photoUrl} alt={project.title} className="w-full h-full object-cover border border-gray-400" />
        ) : (
          <div className="border border-gray-400 flex items-center justify-center text-xs text-gray-400">No photo</div>
        )}
        <FieldTable title="Tenant Profile" group={tenantProfile} values={localValues} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldTable title="Area / Availability" group={areaAvailability} values={localValues} />
        <FieldTable title="Commercial Details" group={commercialDetails} values={localValues} />
      </div>
    </div>
  );
}
