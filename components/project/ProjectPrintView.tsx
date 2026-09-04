import { isBlankResponseValue } from "@/lib/utils";

type Question = { id: string; label: string; sortOrder: number; fieldType: string; isInternal: boolean; showInPrint: boolean };
type Group = { id: string; name: string; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type Project = {
  projectNumber: string; title: string;
  category: { name: string }; subcategory: { name: string };
  template: { groups: TemplateGroup[] };
};

function FieldTable({ title, questions, values }: { title: string; questions: Question[]; values: Record<string, string> }) {
  const rows = questions
    .slice().sort((a, b) => a.sortOrder - b.sortOrder)
    .map((q) => ({ label: q.label, value: !isBlankResponseValue(values[q.id], q.fieldType) ? values[q.id].trim() : "—" }));

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
  const printableGroups = project.template.groups
    .slice().sort((a, b) => a.sortOrder - b.sortOrder)
    .map((tg) => ({
      ...tg.group,
      questions: tg.group.questions.filter((q) => !q.isInternal && q.showInPrint),
    }))
    .filter((g) => g.questions.length > 0);

  const firstGroup = printableGroups[0];
  const restGroups = printableGroups.slice(1);

  return (
    <div className="print-area hidden p-8 text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>
      <div className="flex items-baseline justify-between border-b-2 border-gray-900 pb-2 mb-4">
        <div>
          <h1 className="text-lg font-bold">{project.title}</h1>
          <p className="text-xs text-gray-500">{project.projectNumber} · {project.category.name} · {project.subcategory.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {firstGroup && <FieldTable title={firstGroup.name} questions={firstGroup.questions} values={localValues} />}
        {photoUrl ? (
          <img src={photoUrl} alt={project.title} className="w-full h-full object-cover border border-gray-400" />
        ) : (
          <div className="border border-gray-400 flex items-center justify-center text-xs text-gray-400">No photo</div>
        )}
        {restGroups[0] && <FieldTable title={restGroups[0].name} questions={restGroups[0].questions} values={localValues} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {restGroups.slice(1).map((g) => (
          <FieldTable key={g.id} title={g.name} questions={g.questions} values={localValues} />
        ))}
      </div>
    </div>
  );
}
