"use client";

import { useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "./GalleryTab";

export default function CreatePptModal({
  projectId, apiBase, images, onClose,
}: {
  projectId: string; apiBase: string; images: GalleryImage[]; onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(images.map((i) => i.id));
  const [previewIndex, setPreviewIndex] = useState(0);
  const [converting, setConverting] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const byId = new Map(images.map((i) => [i.id, i]));
  const slideCount = selected.length + 2; // cover + N images + thank-you
  const clampedIndex = Math.min(previewIndex, slideCount - 1);

  function toggle(id: string) {
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

  async function handleConvert() {
    if (selected.length === 0) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/marketing-ppt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: selected }),
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
      return (
        <div className="w-full h-full bg-white flex flex-col justify-center px-8">
          <p className="text-2xl font-bold text-[#1a2b3c]">BEYONDINFRA PVT. LTD.</p>
          <p className="text-sm font-bold text-blue-600 mt-1">Industrial | Commercial | Residential</p>
          <div className="mt-4 space-y-1.5 text-xs text-gray-700">
            <p>✦ Real Estate Consultancy</p>
            <p>✦ Turn Key Solutions</p>
            <p>✦ One Stop Solutions</p>
            <p>✦ International Properties</p>
          </div>
        </div>
      );
    }
    if (clampedIndex === slideCount - 1) {
      return (
        <div className="w-full h-full bg-blue-600 flex flex-col items-center justify-center gap-2">
          <p className="text-xl font-bold text-white tracking-wide">THANK YOU</p>
          <p className="text-[10px] text-blue-100">+91 96770 30372 | +91 80560 03031</p>
          <p className="text-[10px] text-blue-100">www.beyondinfra.com</p>
        </div>
      );
    }
    const imgId = selected[clampedIndex - 1];
    const img = byId.get(imgId);
    return (
      <div className="w-full h-full bg-white flex">
        <div className="flex-1 bg-gray-100">
          {img && <img src={`${apiBase}/${imgId}`} alt={img.originalName} className="w-full h-full object-cover" />}
        </div>
        <div className="w-2/5 bg-[#1a2b3c] p-3 flex flex-col justify-center">
          <p className="text-white text-xs font-bold">Property Title</p>
          <p className="text-gray-400 text-[9px] mt-1">Category · Subcategory</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Create Presentation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: image picker + order */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-4">
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
                    <button onClick={() => toggle(id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
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
                      onClick={() => toggle(img.id)}
                      className="relative rounded overflow-hidden border border-gray-200 opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <img src={`${apiBase}/${img.id}`} alt={img.originalName} className="w-full h-14 object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: preview */}
          <div className="w-1/2 p-4 flex flex-col">
            <p className="text-xs font-semibold text-gray-500 mb-2">PREVIEW</p>
            <div className="flex-1 rounded-lg overflow-hidden border border-gray-200" style={{ aspectRatio: "16/9" }}>
              {renderPreview()}
            </div>
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                disabled={clampedIndex === 0}
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">Slide {clampedIndex + 1} of {slideCount}</span>
              <button
                onClick={() => setPreviewIndex((i) => Math.min(slideCount - 1, i + 1))}
                disabled={clampedIndex === slideCount - 1}
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
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
