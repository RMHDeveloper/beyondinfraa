"use client";

import { useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectImageGroup = {
  projectId: string;
  projectTitle: string;
  images: { id: string; originalName: string }[];
};

type Pick = { projectId: string; imageId: string };

export default function CreateMultiProjectPptModal({
  groups, apiBaseFor, onClose,
}: {
  groups: ProjectImageGroup[];
  apiBaseFor: (projectId: string) => string;
  onClose: () => void;
}) {
  const allPicks: Pick[] = groups.flatMap((g) => g.images.map((i) => ({ projectId: g.projectId, imageId: i.id })));
  const [selected, setSelected] = useState<Pick[]>(allPicks);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [converting, setConverting] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const titleById = new Map(groups.map((g) => [g.projectId, g.projectTitle]));
  const nameById = new Map(groups.flatMap((g) => g.images.map((i) => [i.id, i.originalName] as const)));
  const key = (p: Pick) => `${p.projectId}:${p.imageId}`;
  const selectedKeys = new Set(selected.map(key));

  const slideCount = selected.length + 2; // cover + N images + thank-you
  const clampedIndex = Math.min(previewIndex, slideCount - 1);

  function toggle(pick: Pick) {
    setSelected((cur) =>
      cur.some((p) => key(p) === key(pick)) ? cur.filter((p) => key(p) !== key(pick)) : [...cur, pick]
    );
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

  async function handleConvert() {
    if (selected.length === 0) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/proposals/marketing-ppt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selected }),
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
    const pick = selected[clampedIndex - 1];
    const src = pick ? `${apiBaseFor(pick.projectId)}/${pick.imageId}` : "";
    return (
      <div className="relative w-full h-full overflow-hidden">
        <img src="/ppt-template/middle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        {pick && (
          <img src={src} alt=""
            className="absolute left-[8%] top-[16%] w-[84%] h-[62%] object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Create Presentation — Selected Properties</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: image picker + order, grouped by property */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">SELECT &amp; ORDER IMAGES</p>
            <div className="space-y-1.5">
              {selected.map((pick, i) => (
                <div
                  key={key(pick)}
                  draggable
                  onDragStart={() => { dragIndex.current = i; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className="flex items-center gap-2 p-1.5 bg-blue-50 border border-blue-200 rounded-lg cursor-move"
                >
                  <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-blue-700 w-4">{i + 1}</span>
                  <img src={`${apiBaseFor(pick.projectId)}/${pick.imageId}`} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-700 truncate">{nameById.get(pick.imageId)}</p>
                    <p className="text-[10px] text-gray-400 truncate">{titleById.get(pick.projectId)}</p>
                  </div>
                  <button onClick={() => toggle(pick)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {selected.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">No images selected.</p>
              )}
            </div>

            {groups.map((g) => {
              const remaining = g.images.filter((img) => !selectedKeys.has(key({ projectId: g.projectId, imageId: img.id })));
              if (remaining.length === 0) return null;
              return (
                <div key={g.projectId} className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2">NOT INCLUDED — {g.projectTitle}</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {remaining.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => toggle({ projectId: g.projectId, imageId: img.id })}
                        className="relative rounded overflow-hidden border border-gray-200 opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <img src={`${apiBaseFor(g.projectId)}/${img.id}`} alt={img.originalName} className="w-full h-14 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
            disabled={selected.length === 0 || converting}
            className={cn(
              "flex items-center gap-2 text-xs font-bold text-white px-4 py-2 rounded-lg transition-colors",
              selected.length === 0 || converting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
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
