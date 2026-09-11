"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronRight, Lock, Eye, EyeOff, Printer, Presentation, GripVertical, Plus, Pencil, Trash2, Archive, ArchiveRestore, X } from "lucide-react";
import { cn, subcategoryLabel } from "@/lib/utils";

type Question = {
  id: string; label: string; fieldType: string; isRequired: boolean;
  isInternal: boolean; options: string[]; unit: string | null; helpText: string | null;
  conditionalJson: { parentLabel: string; matchValue: string } | null;
  autoCalcJson: { formula: string } | null;
  showInPrint: boolean; showInPptExport: boolean; isArchived: boolean;
};
type Group = { id: string; name: string; isShared: boolean; _count: { templates: number }; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type Template = {
  id: string; name: string; version: number;
  subcategory: { name: string; category: { name: string } };
  groups: TemplateGroup[];
};

const FIELD_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "PHONE", "EMAIL", "DATE", "RADIO", "DROPDOWN", "MULTISELECT", "REPEATER", "FILE"];
const OPTION_TYPES = new Set(["RADIO", "DROPDOWN", "MULTISELECT"]);

type QuestionForm = {
  label: string; fieldType: string; isRequired: boolean; isInternal: boolean;
  optionsText: string; unit: string; helpText: string;
};
const EMPTY_FORM: QuestionForm = { label: "", fieldType: "TEXT", isRequired: false, isInternal: false, optionsText: "", unit: "", helpText: "" };

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
  const [showArchived, setShowArchived] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const dragGroupId = useRef<string | null>(null);

  const [editorGroupId, setEditorGroupId] = useState<string | null>(null);
  const [editorQuestionId, setEditorQuestionId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    return fetch("/api/settings/templates").then((r) => r.json()).then((data) => {
      setTemplates(data);
      return data;
    });
  }

  useEffect(() => {
    load().then((data) => { if (data.length > 0) setSelectedId((prev) => prev ?? data[0].id); });
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function groupSharedWarning(group: Group) {
    return group._count.templates > 1
      ? `This field group is shared by ${group._count.templates} templates — changes here will apply to all of them. Continue?`
      : null;
  }

  function openAddForm(groupId: string) {
    setEditorGroupId(groupId);
    setEditorQuestionId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openEditForm(groupId: string, q: Question) {
    setEditorGroupId(groupId);
    setEditorQuestionId(q.id);
    setForm({
      label: q.label, fieldType: q.fieldType, isRequired: q.isRequired, isInternal: q.isInternal,
      optionsText: q.options.join("\n"), unit: q.unit ?? "", helpText: q.helpText ?? "",
    });
    setFormError("");
  }

  function closeForm() {
    setEditorGroupId(null);
    setEditorQuestionId(null);
    setFormError("");
  }

  async function submitForm() {
    if (!editorGroupId) return;
    if (!form.label.trim()) { setFormError("Label is required."); return; }

    const group = templates.flatMap((t) => t.groups).map((tg) => tg.group).find((g) => g.id === editorGroupId);
    if (group && !editorQuestionId) {
      const warning = groupSharedWarning(group);
      if (warning && !confirm(warning)) return;
    }

    setSaving(true);
    setFormError("");
    const options = OPTION_TYPES.has(form.fieldType)
      ? form.optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];
    const payload = {
      label: form.label.trim(), fieldType: form.fieldType,
      isRequired: form.isRequired, isInternal: form.isInternal,
      options, unit: form.unit.trim() || null, helpText: form.helpText.trim() || null,
    };

    const res = editorQuestionId
      ? await fetch(`/api/settings/templates/questions/${editorQuestionId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        })
      : await fetch("/api/settings/templates/questions", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, groupId: editorGroupId }),
        });

    setSaving(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setFormError(e.error ?? "Failed to save.");
      return;
    }
    await load();
    closeForm();
  }

  async function deleteQuestion(q: Question, group: Group) {
    const warning = groupSharedWarning(group);
    if (warning && !confirm(warning)) return;
    if (!confirm(`Delete "${q.label}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/settings/templates/questions/${q.id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error ?? "Failed to delete.");
      return;
    }
    await load();
  }

  async function toggleArchive(q: Question, group: Group) {
    const warning = groupSharedWarning(group);
    if (warning && !confirm(warning)) return;

    const res = await fetch(`/api/settings/templates/questions/${q.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isArchived: !q.isArchived }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error ?? "Failed to update.");
      return;
    }
    await load();
  }

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
                {selected.subcategory.category.name} → {subcategoryLabel(selected.subcategory.name)} · v{selected.version} · {selected.groups.length} groups
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchived((p) => !p)}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                {showArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                {showArchived ? "Showing archived" : "Archived hidden"}
              </button>
              <button
                onClick={() => setShowInternal((p) => !p)}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                {showInternal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showInternal ? "Showing internal" : "Internal hidden"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {selected.groups.map((tg) => {
              const visibleQs = tg.group.questions
                .filter((q) => showInternal || !q.isInternal)
                .filter((q) => showArchived || !q.isArchived);
              const isOpen = expandedGroups[tg.id] !== false; // default open

              return (
                <div key={tg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2.5 w-full px-4 py-3">
                    <button onClick={() => toggleGroup(tg.id)} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-70 transition-opacity">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className="font-medium text-sm text-gray-900">{tg.group.name}</span>
                      {tg.group.isShared && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">shared</span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">{visibleQs.length} fields</span>
                    </button>
                    <button
                      onClick={() => openAddForm(tg.group.id)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Field
                    </button>
                  </div>

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
                            <th className="text-left px-4 py-2 font-medium">Actions</th>
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
                              className={cn("hover:bg-gray-50", showInternal && "cursor-move", q.isArchived && "opacity-50")}
                            >
                              <td className="px-2 py-2.5 text-gray-300">
                                {showInternal && <GripVertical className="w-3.5 h-3.5" />}
                              </td>
                              <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-medium text-gray-800">{q.label}</span>
                                {q.isArchived && (
                                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">archived</span>
                                )}
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
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditForm(tg.group.id, q)}
                                    title="Edit field"
                                    className="p-1 rounded text-gray-400 hover:text-blue-600"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => toggleArchive(q, tg.group)}
                                    title={q.isArchived ? "Unarchive field" : "Archive field"}
                                    className="p-1 rounded text-gray-400 hover:text-amber-600"
                                  >
                                    {q.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => deleteQuestion(q, tg.group)}
                                    title="Delete field"
                                    className="p-1 rounded text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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

      {editorGroupId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">{editorQuestionId ? "Edit Field" : "Add Field"}</h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                  placeholder="e.g. Budget — Min"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={form.fieldType}
                  onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                >
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {OPTION_TYPES.has(form.fieldType) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Options (one per line)</label>
                  <textarea
                    value={form.optionsText}
                    onChange={(e) => setForm((f) => ({ ...f, optionsText: e.target.value }))}
                    rows={4}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit (optional)</label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                  placeholder="e.g. sqft"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Help text (optional)</label>
                <input
                  value={form.helpText}
                  onChange={(e) => setForm((f) => ({ ...f, helpText: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} />
                  Required
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={form.isInternal} onChange={(e) => setForm((f) => ({ ...f, isInternal: e.target.checked }))} />
                  Internal only
                </label>
              </div>

              {formError && <p className="text-xs text-red-600">{formError}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={closeForm} className="text-xs font-medium text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 border border-gray-200">
                Cancel
              </button>
              <button
                onClick={submitForm}
                disabled={saving}
                className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : editorQuestionId ? "Save Changes" : "Add Field"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
