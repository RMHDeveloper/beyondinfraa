"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronRight, Lock, Eye, EyeOff, Printer, Presentation, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = {
  id: string; label: string; fieldType: string; isRequired: boolean;
  isInternal: boolean; options: string[]; unit: string | null;
  conditionalJson: { parentLabel: string; matchValue: string } | null;
  autoCalcJson: { formula: string } | null;
  showInPrint: boolean; showInPptExport: boolean;
};
type Group = { id: string; name: string; isShared: boolean; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type Template = {
  id: string; name: string; version: number;
  subcategory: { name: string; category: { name: string } };
  groups: TemplateGroup[];
};

const FIELD_COLORS: Record<string, string> = {
  TEXT: "bg-gray-100 text-gray-600",
  TEXTAREA: "bg-gray-100 text-gray-600",
  NUMBER: "bg-blue-50 text-blue-700",
  PHONE: "bg-blue-50 text-blue-700",
  EMAIL: "bg-blue-50 text-blue-700",
  DATE: "bg-purple-50 text-purple-700",
  RADIO: "bg-amber-50 text-amber-700",
  DROPDOWN: "bg-amber-50 text-amber-700",
  MULTISELECT: "bg-orange-50 text-orange-700",
  REPEATER: "bg-green-50 text-green-700",
  FILE: "bg-rose-50 text-rose-700",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showInternal, setShowInternal] = useState(true);
  const dragIndex = useRef<number | null>(null);
  const dragGroupId = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/templates").then((r) => r.json()).then((data) => {
      setTemplates(data);
      if (data.length > 0) setSelectedId(data[0].id);
    });
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function toggleGroup(id: string) {
    setExpandedGroups((p) => ({ ...p, [id]: !p[id] }));
  }

  async function toggleQuestionFlag(questionId: string, field: "showInPrint" | "showInPptExport") {
    const template = templates.find((t) => t.groups.some((tg) => tg.group.questions.some((q) => q.id === questionId)));
    const question = template?.groups.flatMap((tg) => tg.group.questions).find((q) => q.id === questionId);
    if (!question) return;
    const next = !question[field];

    setTemplates((prev) => prev.map((t) => ({
      ...t,
      groups: t.groups.map((tg) => ({
        ...tg,
        group: {
          ...tg.group,
          questions: tg.group.questions.map((q) => (q.id === questionId ? { ...q, [field]: next } : q)),
        },
      })),
    })));

    await fetch(`/api/settings/templates/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    });
  }

  async function handleReorder(groupId: string, targetIndex: number) {
    const fromIndex = dragIndex.current;
    dragIndex.current = null;
    dragGroupId.current = null;
    if (fromIndex === null || fromIndex === targetIndex) return;

    let orderedIds: string[] = [];
    setTemplates((prev) => prev.map((t) => ({
      ...t,
      groups: t.groups.map((tg) => {
        if (tg.group.id !== groupId) return tg;
        const questions = [...tg.group.questions];
        const [moved] = questions.splice(fromIndex, 1);
        questions.splice(targetIndex, 0, moved);
        orderedIds = questions.map((q) => q.id);
        return { ...tg, group: { ...tg.group, questions } };
      }),
    })));

    if (orderedIds.length === 0) return;
    await fetch("/api/settings/templates/questions/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, orderedIds }),
    });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-5xl">
      {/* Template list */}
      <div className="w-full lg:w-56 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Templates</p>
        <div className="space-y-0.5">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedId(t.id); setExpandedGroups({}); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                selectedId === t.id
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <span className="block text-xs opacity-60 mb-0.5">{t.subcategory.category.name}</span>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Template detail */}
      {selected && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">{selected.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {selected.subcategory.category.name} → {selected.subcategory.name} · v{selected.version} · {selected.groups.length} groups
              </p>
            </div>
            <button
              onClick={() => setShowInternal((p) => !p)}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              {showInternal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showInternal ? "Showing internal" : "Internal hidden"}
            </button>
          </div>

          <div className="space-y-2">
            {selected.groups.map((tg) => {
              const visibleQs = showInternal
                ? tg.group.questions
                : tg.group.questions.filter((q) => !q.isInternal);
              const isOpen = expandedGroups[tg.id] !== false; // default open

              return (
                <div key={tg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleGroup(tg.id)}
                    className="flex items-center gap-2.5 w-full px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-medium text-sm text-gray-900">{tg.group.name}</span>
                    {tg.group.isShared && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">shared</span>
                    )}
                    <span className="ml-auto text-xs text-gray-400">{visibleQs.length} fields</span>
                  </button>

                  {isOpen && visibleQs.length > 0 && (
                    <div className="border-t border-gray-100 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide sticky top-0 z-10">
                            <th className="text-left px-4 py-2 font-medium w-6"></th>
                            <th className="text-left px-4 py-2 font-medium">#</th>
                            <th className="text-left px-4 py-2 font-medium">Field</th>
                            <th className="text-left px-4 py-2 font-medium">Type</th>
                            <th className="text-left px-4 py-2 font-medium">Options / Notes</th>
                            <th className="text-left px-4 py-2 font-medium">Flags</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {visibleQs.map((q, i) => (
                            <tr
                              key={q.id}
                              draggable={showInternal}
                              onDragStart={() => { dragIndex.current = i; dragGroupId.current = tg.group.id; }}
                              onDragOver={(e) => { if (dragGroupId.current === tg.group.id) e.preventDefault(); }}
                              onDrop={() => handleReorder(tg.group.id, i)}
                              className={cn("hover:bg-gray-50", showInternal && "cursor-move")}
                            >
                              <td className="px-2 py-2.5 text-gray-300">
                                {showInternal && <GripVertical className="w-3.5 h-3.5" />}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-gray-800">{q.label}</span>
                                {q.conditionalJson && (
                                  <span className="block text-gray-400 mt-0.5">
                                    ↳ if {q.conditionalJson.parentLabel} = {q.conditionalJson.matchValue}
                                  </span>
                                )}
                                {q.unit && <span className="text-gray-400"> ({q.unit})</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={cn("px-2 py-0.5 rounded-full font-medium", FIELD_COLORS[q.fieldType] ?? "bg-gray-100 text-gray-600")}>
                                  {q.fieldType}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 max-w-xs">
                                {q.options.length > 0 && q.options.slice(0, 4).join(" / ")}
                                {q.options.length > 4 && ` +${q.options.length - 4}`}
                                {q.autoCalcJson && <span className="text-purple-600">auto-calc</span>}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  {q.isRequired && <span className="text-amber-600 font-bold" title="Required">✳</span>}
                                  {q.isInternal && <span title="Internal only"><Lock className="w-3 h-3 text-gray-400" /></span>}
                                  <button
                                    onClick={() => toggleQuestionFlag(q.id, "showInPrint")}
                                    title={q.showInPrint ? "Shown in print — click to hide" : "Hidden from print — click to show"}
                                    className={cn("p-1 rounded", q.showInPrint ? "text-blue-600" : "text-gray-300 hover:text-gray-500")}
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => toggleQuestionFlag(q.id, "showInPptExport")}
                                    title={q.showInPptExport ? "Shown in PPT — click to hide" : "Hidden from PPT — click to show"}
                                    className={cn("p-1 rounded", q.showInPptExport ? "text-blue-600" : "text-gray-300 hover:text-gray-500")}
                                  >
                                    <Presentation className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
