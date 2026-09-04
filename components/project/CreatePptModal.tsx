"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, GripVertical, ChevronDown } from "lucide-react";
import { cn, isBlankResponseValue } from "@/lib/utils";
import type { GalleryImage } from "./GalleryTab";
import type { PptExportConfig } from "@/app/(internal)/projects/[id]/page";

// Must match CUSTOM_FIELD_PREFIX in lib/pptTemplate.ts (not imported directly — that
// module pulls in server-only deps like `fs` and `sharp` that can't reach the client bundle).
// Each custom field gets its own row (CUSTOM_FIELD_PREFIX + field id) so it can be
// individually dragged anywhere among the template groups.
const CUSTOM_FIELD_PREFIX = "__custom_field__";

type Question = { id: string; label: string; fieldType: string; isInternal: boolean; showInPptExport: boolean };
type Group = { id: string; name: string; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };

type CustomField = { id: string; label: string; value: string | null; type: "TEXT" | "IMAGE"; file: { id: string; originalName: string } | null };

// A regular template-group row, or a single custom field's own row (isCustomField: true) —
// the latter is reorderable individually alongside real groups via CUSTOM_FIELD_PREFIX.
type GroupState = {
  groupId: string; name: string; included: boolean;
  questions: { id: string; label: string; fieldType: string; included: boolean }[];
  isCustomField?: boolean;
};

// Builds the template-group rows only — custom field rows are merged in separately once
// they've loaded (async fetch), inserted at their saved groupOrder position if present.
function buildInitialGroups(templateGroups: TemplateGroup[], config: PptExportConfig | null): GroupState[] {
  const exportableGroups = templateGroups.filter((tg) => tg.group.questions.some((q) => !q.isInternal));
  const byId = new Map(exportableGroups.map((tg) => [tg.group.id, tg]));
  const orderedIds = config?.groupOrder?.filter((gid) => byId.has(gid)) ?? [];
  for (const tg of exportableGroups) if (!orderedIds.includes(tg.group.id)) orderedIds.push(tg.group.id);

  return orderedIds.map((groupId) => {
    const tg = byId.get(groupId)!;
    const visibleQuestions = tg.group.questions.filter((q) => !q.isInternal);
    const savedGroup = config?.groups?.[groupId];
    const qOrder = savedGroup?.questionOrder?.filter((qid) => visibleQuestions.some((q) => q.id === qid)) ?? [];
    for (const q of visibleQuestions) if (!qOrder.includes(q.id)) qOrder.push(q.id);
    const qById = new Map(visibleQuestions.map((q) => [q.id, q]));

    return {
      groupId,
      name: tg.group.name,
      included: savedGroup?.included ?? visibleQuestions.some((q) => q.showInPptExport),
      questions: qOrder.map((qid) => ({
        id: qid,
        label: qById.get(qid)!.label,
        fieldType: qById.get(qid)!.fieldType,
        included: savedGroup ? !savedGroup.excludedQuestionIds.includes(qid) : qById.get(qid)!.showInPptExport,
      })),
    };
  });
}

export default function CreatePptModal({
  projectId, apiBase, customFieldsApiBase, images, templateGroups, responseMap, initialConfig, onClose,
}: {
  projectId: string; apiBase: string; customFieldsApiBase: string; images: GalleryImage[];
  templateGroups: TemplateGroup[]; responseMap: Record<string, string>; initialConfig: PptExportConfig | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"fields" | "images">("fields");
  const [selected, setSelected] = useState<string[]>(images.map((i) => i.id));
  const [groups, setGroups] = useState<GroupState[]>(() => buildInitialGroups(templateGroups, initialConfig));
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [converting, setConverting] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const groupDragIndex = useRef<number | null>(null);
  const questionDragIndex = useRef<number | null>(null);

  // Custom fields load async, then merge in as their own rows in `groups` — each at its
  // saved groupOrder position (if any), otherwise appended at the end.
  useEffect(() => {
    fetch(customFieldsApiBase).then((res) => res.ok ? res.json() : []).then((fields: CustomField[]) => {
      setCustomFields(fields);
      const excluded = new Set(initialConfig?.excludedCustomFieldIds ?? []);
      const savedOrder = initialConfig?.groupOrder ?? [];
      const fieldRow = (f: CustomField): GroupState => ({
        groupId: `${CUSTOM_FIELD_PREFIX}${f.id}`, name: f.label, included: !excluded.has(f.id), questions: [], isCustomField: true,
      });
      setGroups((cur) => {
        const next = [...cur];
        for (const f of fields) {
          const gid = `${CUSTOM_FIELD_PREFIX}${f.id}`;
          if (next.some((g) => g.groupId === gid)) continue;
          const savedIndex = savedOrder.indexOf(gid);
          if (savedIndex === -1) {
            next.push(fieldRow(f));
            continue;
          }
          let insertAt = next.length;
          for (let i = savedIndex + 1; i < savedOrder.length; i++) {
            const idx = next.findIndex((g) => g.groupId === savedOrder[i]);
            if (idx !== -1) { insertAt = idx; break; }
          }
          next.splice(insertAt, 0, fieldRow(f));
        }
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFieldsApiBase]);

  const byId = new Map(images.map((i) => [i.id, i]));
  const customFieldById = useMemo(() => new Map(customFields.map((f) => [f.id, f])), [customFields]);
  const FIELDS_PER_SLIDE = 8;

  // Walks `groups` in the user's chosen order, emitting one slide-unit per group page and,
  // at each custom field row's own position, its single slide. Mirrors
  // addFieldSlides()/addCustomFieldSlide() in lib/pptTemplate.ts.
  type SlideUnit =
    | { type: "group"; pageLabel: string; questions: GroupState["questions"] }
    | { type: "customText"; field: CustomField }
    | { type: "customImage"; field: CustomField };
  const slideUnits = useMemo(() => {
    const units: SlideUnit[] = [];
    for (const g of groups) {
      if (g.isCustomField) {
        if (!g.included) continue;
        const field = customFieldById.get(g.groupId.slice(CUSTOM_FIELD_PREFIX.length));
        if (!field) continue;
        if (field.type === "TEXT" && field.value?.trim()) units.push({ type: "customText", field });
        else if (field.type === "IMAGE" && field.file) units.push({ type: "customImage", field });
        continue;
      }
      if (!g.included) continue;
      const rows = g.questions.filter((q) => q.included);
      if (rows.length === 0) continue;
      const chunks: (typeof rows)[] = [];
      for (let i = 0; i < rows.length; i += FIELDS_PER_SLIDE) chunks.push(rows.slice(i, i + FIELDS_PER_SLIDE));
      chunks.forEach((chunk, i) => {
        units.push({ type: "group", pageLabel: chunks.length > 1 ? `${g.name} (${i + 1})` : g.name, questions: chunk });
      });
    }
    return units;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, customFieldById]);
  const slideCount = 1 + slideUnits.length + selected.length + 1; // cover + field/custom slides + images + thank-you
  const clampedIndex = Math.min(previewIndex, slideCount - 1);

  function toggleImage(id: string) {
    setSelected((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setSelected((cur) => {
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    setGroups((cur) => cur.map((g) => g.groupId === groupId ? { ...g, included: !g.included } : g));
  }

  function toggleQuestion(groupId: string, questionId: string) {
    setGroups((cur) => cur.map((g) =>
      g.groupId === groupId
        ? { ...g, questions: g.questions.map((q) => q.id === questionId ? { ...q, included: !q.included } : q) }
        : g
    ));
  }

  function handleGroupDrop(targetIndex: number) {
    const from = groupDragIndex.current;
    groupDragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setGroups((cur) => {
      const next = [...cur];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function handleQuestionDrop(groupId: string, targetIndex: number) {
    const from = questionDragIndex.current;
    questionDragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setGroups((cur) => cur.map((g) => {
      if (g.groupId !== groupId) return g;
      const next = [...g.questions];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return { ...g, questions: next };
    }));
  }

  function buildConfig(): PptExportConfig {
    return {
      groupOrder: groups.map((g) => g.groupId),
      groups: Object.fromEntries(groups.filter((g) => !g.isCustomField).map((g) => [g.groupId, {
        included: g.included,
        questionOrder: g.questions.map((q) => q.id),
        excludedQuestionIds: g.questions.filter((q) => !q.included).map((q) => q.id),
      }])),
      excludedCustomFieldIds: groups.filter((g) => g.isCustomField && !g.included).map((g) => g.groupId.slice(CUSTOM_FIELD_PREFIX.length)),
    };
  }

  async function handleConvert() {
    if (selected.length === 0 && slideUnits.length === 0) return;
    setConverting(true);
    try {
      const config = buildConfig();
      await fetch(`/api/projects/${projectId}/ppt-export-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pptExportConfig: config }),
      });

      const res = await fetch(`/api/projects/${projectId}/marketing-ppt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: selected, pptExportConfig: config }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "property-presentation.pptx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      alert("Failed to generate PPT. Please try again.");
    } finally {
      setConverting(false);
    }
  }

  function renderPreview() {
    if (clampedIndex === 0) {
      return <img src="/ppt-template/cover.png" alt="Cover slide" className="w-full h-full object-cover" />;
    }
    if (clampedIndex === slideCount - 1) {
      return <img src="/ppt-template/thankyou.png" alt="Thank you slide" className="w-full h-full object-cover" />;
    }
    const fieldSlideIndex = clampedIndex - 1;
    if (fieldSlideIndex < slideUnits.length) {
      const unit = slideUnits[fieldSlideIndex];
      if (unit.type === "group") {
        return (
          <div className="relative w-full h-full overflow-hidden p-4">
            <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
            <span className="relative text-[#111111] text-[11px] font-bold uppercase tracking-wide">{unit.pageLabel}</span>
            <div className="relative grid grid-cols-2 gap-x-4 gap-y-2 mt-[6%]">
              {unit.questions.map((q) => {
                const val = responseMap[q.id] ?? "";
                const isBlank = isBlankResponseValue(val, q.fieldType);
                return (
                  <div key={q.id} className="border-b border-gray-200 pb-1">
                    <p className="text-[13px] font-bold text-gray-500">{q.label}</p>
                    <p className="text-[17px] text-gray-900">{!isBlank ? val : "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      if (unit.type === "customText") {
        return (
          <div className="relative w-full h-full overflow-hidden p-4">
            <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
            <span className="relative text-[#111111] text-[11px] font-bold uppercase tracking-wide">{unit.field.label}</span>
            <p className="relative text-[11px] text-gray-900 mt-[6%] whitespace-pre-wrap">{unit.field.value}</p>
          </div>
        );
      }
      const imgField = unit.field;
      return (
        <div className="relative w-full h-full overflow-hidden">
          <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute top-3 left-4 text-[#111111] text-[11px] font-bold uppercase tracking-wide">{imgField.label}</span>
          <img src={`${apiBase}/${imgField.file!.id}`} alt={imgField.file!.originalName}
            className="absolute left-[8%] top-[16%] w-[84%] h-[62%] object-cover" />
        </div>
      );
    }
    const imgId = selected[fieldSlideIndex - slideUnits.length];
    const img = byId.get(imgId);
    return (
      <div className="relative w-full h-full overflow-hidden">
        <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        {img && (
          <img src={`${apiBase}/${imgId}`} alt={img.originalName}
            className="absolute left-[8%] top-[16%] w-[84%] h-[62%] object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Create Presentation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: tabbed picker */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-200 px-4 pt-2 gap-1 flex-shrink-0">
              <button
                onClick={() => setActiveTab("fields")}
                className={cn("text-xs font-semibold px-3 py-2 rounded-t-lg -mb-px border",
                  activeTab === "fields" ? "border-gray-200 border-b-white text-blue-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700")}
              >
                Template Fields
              </button>
              <button
                onClick={() => setActiveTab("images")}
                className={cn("text-xs font-semibold px-3 py-2 rounded-t-lg -mb-px border",
                  activeTab === "images" ? "border-gray-200 border-b-white text-blue-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700")}
              >
                Images ({selected.length})
              </button>
            </div>

            {activeTab === "fields" && (
              <div className="overflow-y-auto p-4 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 mb-2">SELECT, REORDER &amp; EDIT SLIDE GROUPS</p>
                {groups.map((g, gi) => {
                  if (g.isCustomField) {
                    const field = customFieldById.get(g.groupId.slice(CUSTOM_FIELD_PREFIX.length));
                    return (
                      <div
                        key={g.groupId}
                        draggable
                        onDragStart={() => { groupDragIndex.current = gi; }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleGroupDrop(gi)}
                        className={cn("rounded-lg border flex items-center gap-2 p-2 cursor-move", g.included ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50")}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <input
                          type="checkbox"
                          checked={g.included}
                          onChange={() => toggleGroup(g.groupId)}
                          className="w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span className="text-xs font-bold text-gray-800 flex-1 truncate">{g.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{field?.type === "IMAGE" ? "image" : "text"}</span>
                      </div>
                    );
                  }
                  const includedCount = g.questions.filter((q) => q.included).length;
                  const totalCount = g.questions.length;
                  return (
                    <div
                      key={g.groupId}
                      draggable
                      onDragStart={() => { groupDragIndex.current = gi; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleGroupDrop(gi)}
                      className={cn("rounded-lg border", includedCount > 0 ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50")}
                    >
                      <div className="flex items-center gap-2 p-2 cursor-move">
                        <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <input
                          type="checkbox"
                          checked={g.included}
                          onChange={() => toggleGroup(g.groupId)}
                          className="w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span className="text-xs font-bold text-gray-800 flex-1 truncate">{g.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {includedCount}/{totalCount}
                        </span>
                        <button
                          onClick={() => setExpandedGroupId((cur) => cur === g.groupId ? null : g.groupId)}
                          className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                        >
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expandedGroupId === g.groupId && "rotate-180")} />
                        </button>
                      </div>

                      {expandedGroupId === g.groupId && (
                        <div className="px-2 pb-2 space-y-1">
                          {g.questions.map((q, qi) => (
                            <div
                              key={q.id}
                              draggable
                              onDragStart={() => { questionDragIndex.current = qi; }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleQuestionDrop(g.groupId, qi)}
                              className="flex items-center gap-2 pl-5 pr-2 py-1 bg-white rounded border border-gray-100 cursor-move"
                            >
                              <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                              <input
                                type="checkbox"
                                checked={q.included}
                                onChange={() => toggleQuestion(g.groupId, q.id)}
                                className="w-3 h-3 flex-shrink-0"
                              />
                              <span className="text-[11px] text-gray-600 truncate">{q.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "images" && (
              <div className="overflow-y-auto p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">SELECT &amp; ORDER IMAGES</p>
                <div className="space-y-1.5">
                  {selected.map((id, i) => {
                    const img = byId.get(id);
                    if (!img) return null;
                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={() => { dragIndex.current = i; }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(i)}
                        className="flex items-center gap-2 p-1.5 bg-blue-50 border border-blue-200 rounded-lg cursor-move"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-blue-700 w-4">{i + 1}</span>
                        <img src={`${apiBase}/${id}`} alt={img.originalName} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{img.originalName}</span>
                        <button onClick={() => toggleImage(id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {images.some((i) => !selected.includes(i.id)) && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 mt-4 mb-2">NOT INCLUDED</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {images.filter((i) => !selected.includes(i.id)).map((img) => (
                        <button
                          key={img.id}
                          onClick={() => toggleImage(img.id)}
                          className="relative rounded overflow-hidden border border-gray-200 opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <img src={`${apiBase}/${img.id}`} alt={img.originalName} className="w-full h-14 object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: preview, with slide navigation on the preview itself */}
          <div className="w-1/2 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">PREVIEW</p>
              <span className="text-xs text-gray-500">Slide {clampedIndex + 1} of {slideCount}</span>
            </div>
            <div className="relative flex-1 rounded-lg overflow-hidden border border-gray-200" style={{ aspectRatio: "16/9" }}>
              {renderPreview()}
              <button
                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                disabled={clampedIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-0 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewIndex((i) => Math.min(slideCount - 1, i + 1))}
                disabled={clampedIndex === slideCount - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-0 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
          <button onClick={onClose} className="text-xs font-medium text-gray-600 border border-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={(selected.length === 0 && slideUnits.length === 0) || converting}
            className={cn(
              "flex items-center gap-2 text-xs font-bold text-white px-4 py-2 rounded-lg transition-colors",
              (selected.length === 0 && slideUnits.length === 0) || converting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {converting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {converting ? "Converting…" : "Confirm & Convert"}
          </button>
        </div>
      </div>
    </div>
  );
}
