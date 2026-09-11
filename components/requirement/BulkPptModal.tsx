"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight, ChevronDown, GripVertical, Loader2 } from "lucide-react";
import { cn, isBlankResponseValue } from "@/lib/utils";
import type { PptExportConfig } from "@/app/(internal)/projects/[id]/page";

type Property = { id: string; projectNumber: string; title: string };

type Question = { id: string; label: string; fieldType: string; isInternal: boolean; isRequired: boolean; showInPptExport: boolean };
type Group = { id: string; name: string; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type PreviewData = { templateGroups: TemplateGroup[]; responseMap: Record<string, string>; pptExportConfig: PptExportConfig | null };

// A single property's editable box/field selection — same shape as CreatePptModal's
// GroupState, minus custom fields/images (bulk export doesn't support those).
type GroupState = {
  groupId: string; name: string; included: boolean;
  questions: { id: string; label: string; fieldType: string; included: boolean }[];
};

const FIELDS_PER_SLIDE = 8;

// One slide-unit per property field-group page — mirrors addFieldSlides() in
// lib/pptTemplate.ts, so the bulk preview matches what the exported PPTX will contain.
type FieldSlideUnit = { pageLabel: string; questions: { id: string; label: string; fieldType: string }[] };

// Builds the editable group/question rows for one property, seeded from its saved config
// (or defaults if none), matching CreatePptModal's buildInitialGroups.
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

function buildConfig(groups: GroupState[]): PptExportConfig {
  return {
    groupOrder: groups.map((g) => g.groupId),
    groups: Object.fromEntries(groups.map((g) => [g.groupId, {
      included: g.included,
      questionOrder: g.questions.map((q) => q.id),
      excludedQuestionIds: g.questions.filter((q) => !q.included).map((q) => q.id),
    }])),
    excludedCustomFieldIds: [],
  };
}

function buildSlideUnitsFromGroups(groups: GroupState[]): FieldSlideUnit[] {
  const units: FieldSlideUnit[] = [];
  for (const g of groups) {
    if (!g.included) continue;
    const rows = g.questions.filter((q) => q.included);
    if (rows.length === 0) continue;
    const chunks: (typeof rows)[] = [];
    for (let i = 0; i < rows.length; i += FIELDS_PER_SLIDE) chunks.push(rows.slice(i, i + FIELDS_PER_SLIDE));
    chunks.forEach((chunk, i) => {
      units.push({ pageLabel: chunks.length > 1 ? `${g.name} (${i + 1})` : g.name, questions: chunk });
    });
  }
  return units;
}

export default function BulkPptModal({
  properties, demandProjectId, onDone, onClose,
}: {
  properties: Property[];
  demandProjectId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, PreviewData>>({});
  const [previewLoading, setPreviewLoading] = useState(true);
  const [groupsByProperty, setGroupsByProperty] = useState<Record<string, GroupState[]>>({});
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const groupDragIndex = useRef<number | null>(null);
  const questionDragIndex = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      properties.map(async (p) => {
        const res = await fetch(`/api/projects/${p.id}/ppt-preview-data`);
        return [p.id, res.ok ? await res.json() : { templateGroups: [], responseMap: {}, pptExportConfig: null }] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      const data = Object.fromEntries(entries) as Record<string, PreviewData>;
      setPreviewData(data);
      setGroupsByProperty(
        Object.fromEntries(properties.map((p) => [p.id, buildInitialGroups(data[p.id].templateGroups, data[p.id].pptExportConfig)]))
      );
      setPreviewLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-property field-group slide units, driven by the live editable groups once loaded.
  const unitsByProperty = useMemo(
    () => properties.map((p) => groupsByProperty[p.id] ? buildSlideUnitsFromGroups(groupsByProperty[p.id]) : null),
    [properties, groupsByProperty]
  );

  // Flat list of (propertyIndex, unit) pairs — one entry per field-group ("box") slide,
  // matching addFieldSlides() in lib/pptTemplate.ts exactly: no separate title slide per
  // property, just its box slides with the property name as a running corner label.
  const slides = useMemo(() => {
    const out: { propertyIndex: number; unit: FieldSlideUnit }[] = [];
    properties.forEach((_, i) => {
      for (const unit of unitsByProperty[i] ?? []) out.push({ propertyIndex: i, unit });
    });
    return out;
  }, [properties, unitsByProperty]);

  const slideCount = slides.length + 2; // cover + field-group slides across all properties + thank-you
  const clampedIndex = Math.min(previewIndex, slideCount - 1);

  function toggleGroup(propertyId: string, groupId: string) {
    setGroupsByProperty((cur) => ({
      ...cur,
      [propertyId]: cur[propertyId].map((g) => g.groupId === groupId ? { ...g, included: !g.included } : g),
    }));
  }

  function toggleQuestion(propertyId: string, groupId: string, questionId: string) {
    setGroupsByProperty((cur) => ({
      ...cur,
      [propertyId]: cur[propertyId].map((g) =>
        g.groupId === groupId
          ? { ...g, questions: g.questions.map((q) => q.id === questionId ? { ...q, included: !q.included } : q) }
          : g
      ),
    }));
  }

  function handleGroupDrop(propertyId: string, targetIndex: number) {
    const from = groupDragIndex.current;
    groupDragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setGroupsByProperty((cur) => {
      const next = [...cur[propertyId]];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return { ...cur, [propertyId]: next };
    });
  }

  function handleQuestionDrop(propertyId: string, groupId: string, targetIndex: number) {
    const from = questionDragIndex.current;
    questionDragIndex.current = null;
    if (from === null || from === targetIndex) return;
    setGroupsByProperty((cur) => ({
      ...cur,
      [propertyId]: cur[propertyId].map((g) => {
        if (g.groupId !== groupId) return g;
        const next = [...g.questions];
        const [moved] = next.splice(from, 1);
        next.splice(targetIndex, 0, moved);
        return { ...g, questions: next };
      }),
    }));
  }

  async function handleConvert() {
    setConverting(true);
    setError(null);
    try {
      // Persist each property's edited box/field selection & order to its own saved
      // config first, same as CreatePptModal — bulk-marketing-ppt reads it from the DB.
      await Promise.all(
        properties.map((p) =>
          fetch(`/api/projects/${p.id}/ppt-export-config`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pptExportConfig: buildConfig(groupsByProperty[p.id]) }),
          })
        )
      );

      const res = await fetch(`/api/projects/${demandProjectId}/bulk-marketing-ppt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: properties.map(p => p.id) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "properties-presentation.pptx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export PPT. Please try again.");
    } finally {
      setConverting(false);
    }
  }

  function renderPreview() {
    if (previewLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      );
    }
    if (clampedIndex === 0) {
      return <img src="/ppt-template/cover.png" alt="Cover slide" className="w-full h-full object-cover" />;
    }
    if (clampedIndex === slideCount - 1) {
      return <img src="/ppt-template/thankyou.png" alt="Thank you slide" className="w-full h-full object-cover" />;
    }
    const slide = slides[clampedIndex - 1];
    const p = properties[slide.propertyIndex];

    return (
      <div className="relative w-full h-full overflow-hidden p-4">
        <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <span className="relative text-[#111111] text-[11px] font-bold uppercase tracking-wide">{slide.unit.pageLabel}</span>
        <span className="absolute top-4 right-4 text-[9px] text-gray-400">{p.title}</span>
        <div className="relative grid grid-cols-2 gap-x-4 gap-y-2 mt-[6%]">
          {slide.unit.questions.map((q) => {
            const val = previewData[p.id]?.responseMap[q.id] ?? "";
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

  const editingGroups = editingPropertyId ? groupsByProperty[editingPropertyId] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Export Bulk PPT — {properties.length} {properties.length === 1 ? "Property" : "Properties"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">PROPERTIES</p>
            <div className="space-y-1.5">
              {properties.map((p, i) => {
                const firstSlideIndex = slides.findIndex((s) => s.propertyIndex === i);
                const boxCount = unitsByProperty[i]?.length ?? null;
                const isEditing = editingPropertyId === p.id;
                return (
                  <div key={p.id} className={cn("rounded-lg border", isEditing ? "border-blue-300" : "border-gray-100")}>
                    <button
                      onClick={() => {
                        if (firstSlideIndex !== -1) setPreviewIndex(firstSlideIndex + 1);
                        setEditingPropertyId((cur) => cur === p.id ? null : p.id);
                        setExpandedGroupId(null);
                      }}
                      className="w-full flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg text-left hover:border-blue-300 transition-colors"
                    >
                      <span className="text-[10px] font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-700 truncate">{p.title}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.projectNumber}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{boxCount === null ? "…" : `${boxCount} box${boxCount === 1 ? "" : "es"}`}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform", isEditing && "rotate-180")} />
                    </button>

                    {isEditing && editingGroups && (
                      <div className="px-2 pb-2 pt-1 space-y-1.5">
                        {editingGroups.map((g, gi) => {
                          const includedCount = g.questions.filter((q) => q.included).length;
                          const totalCount = g.questions.length;
                          return (
                            <div
                              key={g.groupId}
                              draggable
                              onDragStart={() => { groupDragIndex.current = gi; }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleGroupDrop(p.id, gi)}
                              className={cn("rounded-lg border bg-white", includedCount > 0 ? "border-blue-200" : "border-gray-200")}
                            >
                              <div className="flex items-center gap-2 p-1.5 cursor-move">
                                <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <input
                                  type="checkbox"
                                  checked={g.included}
                                  onChange={() => toggleGroup(p.id, g.groupId)}
                                  className="w-3.5 h-3.5 flex-shrink-0"
                                />
                                <span className="text-xs font-bold text-gray-800 flex-1 truncate">{g.name}</span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{includedCount}/{totalCount}</span>
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
                                      onDrop={() => handleQuestionDrop(p.id, g.groupId, qi)}
                                      className="flex items-center gap-2 pl-5 pr-2 py-1 bg-gray-50 rounded border border-gray-100 cursor-move"
                                    >
                                      <GripVertical className="w-3 h-3 text-gray-300 flex-shrink-0" />
                                      <input
                                        type="checkbox"
                                        checked={q.included}
                                        onChange={() => toggleQuestion(p.id, g.groupId, q.id)}
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
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-2/3 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">PREVIEW</p>
              <span className="text-xs text-gray-500">Slide {clampedIndex + 1} of {slideCount}</span>
            </div>
            <div className="relative flex-1 rounded-lg overflow-hidden border border-gray-200" style={{ aspectRatio: "16/9" }}>
              {renderPreview()}
              <button
                onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
                disabled={clampedIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-0 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewIndex(i => Math.min(slideCount - 1, i + 1))}
                disabled={clampedIndex === slideCount - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/90 shadow border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-0 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-200">
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <button onClick={onClose} className="text-xs font-medium text-gray-600 border border-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-50 flex-shrink-0">
            Cancel
          </button>
          <button
            onClick={handleConvert}
            disabled={converting}
            className={cn(
              "flex items-center gap-2 text-xs font-bold text-white px-4 py-2 rounded-lg transition-colors flex-shrink-0",
              converting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
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
