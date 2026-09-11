"use client";

import { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn, isBlankResponseValue } from "@/lib/utils";
import type { PptExportConfig } from "@/app/(internal)/projects/[id]/page";

type Property = { id: string; projectNumber: string; title: string };

type Question = { id: string; label: string; fieldType: string; isInternal: boolean; isRequired: boolean; showInPptExport: boolean };
type Group = { id: string; name: string; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type PreviewData = { templateGroups: TemplateGroup[]; responseMap: Record<string, string>; pptExportConfig: PptExportConfig | null };

const FIELDS_PER_SLIDE = 8;

// One slide-unit per property field-group page — mirrors addFieldSlides() in
// lib/pptTemplate.ts and the slide-unit logic in CreatePptModal.tsx, so the bulk
// preview matches what the exported PPTX will actually contain.
type FieldSlideUnit = { pageLabel: string; questions: { id: string; label: string; fieldType: string }[] };

function buildSlideUnits(data: PreviewData): FieldSlideUnit[] {
  const { templateGroups, responseMap, pptExportConfig } = data;
  const groupsById = new Map(templateGroups.map((tg) => [tg.group.id, tg]));
  const groupOrder = pptExportConfig?.groupOrder?.filter((gid) => groupsById.has(gid)) ?? templateGroups.map((tg) => tg.group.id);

  const units: FieldSlideUnit[] = [];
  for (const groupId of groupOrder) {
    const tg = groupsById.get(groupId);
    if (!tg) continue;
    const groupConfig = pptExportConfig?.groups?.[groupId];
    if (groupConfig && !groupConfig.included) continue;

    const visibleQuestions = tg.group.questions.filter((q) => !q.isInternal);
    let questions;
    if (groupConfig) {
      const excluded = new Set(groupConfig.excludedQuestionIds);
      const byId = new Map(visibleQuestions.map((q) => [q.id, q]));
      questions = groupConfig.questionOrder.filter((qid) => byId.has(qid) && !excluded.has(qid)).map((qid) => byId.get(qid)!);
    } else {
      questions = visibleQuestions.filter((q) => q.showInPptExport);
    }
    const rows = questions.filter((q) => {
      const val = responseMap[q.id] ?? "";
      return !isBlankResponseValue(val, q.fieldType) || q.isRequired;
    });
    if (rows.length === 0) continue;

    const chunks: (typeof rows)[] = [];
    for (let i = 0; i < rows.length; i += FIELDS_PER_SLIDE) chunks.push(rows.slice(i, i + FIELDS_PER_SLIDE));
    chunks.forEach((chunk, i) => {
      units.push({ pageLabel: chunks.length > 1 ? `${tg.group.name} (${i + 1})` : tg.group.name, questions: chunk });
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

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      properties.map(async (p) => {
        const res = await fetch(`/api/projects/${p.id}/ppt-preview-data`);
        return [p.id, res.ok ? await res.json() : { templateGroups: [], responseMap: {}, pptExportConfig: null }] as const;
      })
    ).then((entries) => {
      if (!cancelled) setPreviewData(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-property field-group slide units, computed once each property's data has loaded.
  const unitsByProperty = useMemo(
    () => properties.map((p) => previewData[p.id] ? buildSlideUnits(previewData[p.id]) : null),
    [properties, previewData]
  );

  // Flat list of (propertyIndex, unit | null) pairs: a property's title slide, then its
  // field-group slides — "null" unit means the title slide itself.
  const slides = useMemo(() => {
    const out: { propertyIndex: number; unit: FieldSlideUnit | null }[] = [];
    properties.forEach((_, i) => {
      out.push({ propertyIndex: i, unit: null });
      for (const unit of unitsByProperty[i] ?? []) out.push({ propertyIndex: i, unit });
    });
    return out;
  }, [properties, unitsByProperty]);

  const slideCount = slides.length + 2; // cover + (title + field-group slides per property) + thank-you
  const clampedIndex = Math.min(previewIndex, slideCount - 1);

  async function handleConvert() {
    setConverting(true);
    setError(null);
    try {
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
    if (clampedIndex === 0) {
      return <img src="/ppt-template/cover.png" alt="Cover slide" className="w-full h-full object-cover" />;
    }
    if (clampedIndex === slideCount - 1) {
      return <img src="/ppt-template/thankyou.png" alt="Thank you slide" className="w-full h-full object-cover" />;
    }
    const slide = slides[clampedIndex - 1];
    const p = properties[slide.propertyIndex];
    const loaded = !!previewData[p.id];

    if (!slide.unit) {
      return (
        <div className="relative w-full h-full overflow-hidden">
          <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-start justify-start p-[6%]">
            <p className="text-[10px] text-gray-500">{p.projectNumber}</p>
            <p className="text-sm font-bold text-gray-900">{p.title}</p>
            {!loaded && <p className="text-[10px] text-gray-400 mt-1">Loading field slides…</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full overflow-hidden p-4">
        <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <span className="relative text-[#111111] text-[11px] font-bold uppercase tracking-wide">{slide.unit.pageLabel}</span>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
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
                return (
                  <button
                    key={p.id}
                    onClick={() => setPreviewIndex(firstSlideIndex + 1)}
                    className="w-full flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-100 rounded-lg text-left hover:border-blue-300 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{p.projectNumber}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{boxCount === null ? "…" : `${boxCount} box${boxCount === 1 ? "" : "es"}`}</span>
                  </button>
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
