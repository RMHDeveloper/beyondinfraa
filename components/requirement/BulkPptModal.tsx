"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Property = { id: string; projectNumber: string; title: string };

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

  const slideCount = properties.length + 2; // cover + one field-slide preview per property + thank-you
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
    const p = properties[clampedIndex - 1];
    return (
      <div className="relative w-full h-full overflow-hidden">
        <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 flex flex-col items-start justify-start p-[6%]">
          <p className="text-[10px] text-gray-500">{p.projectNumber}</p>
          <p className="text-sm font-bold text-gray-900">{p.title}</p>
          <p className="text-[10px] text-gray-400 mt-1">+ this property's selected field slides</p>
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
              {properties.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setPreviewIndex(i + 1)}
                  className="w-full flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-100 rounded-lg text-left hover:border-blue-300 transition-colors"
                >
                  <span className="text-[10px] font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700 truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{p.projectNumber}</p>
                  </div>
                </button>
              ))}
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
