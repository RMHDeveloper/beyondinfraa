"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Trash2, Loader2, Presentation, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import CreatePptModal from "./CreatePptModal";

export type GalleryImage = {
  id: string; originalName: string; sizeBytes: number; uploadedAt: string;
};

export default function GalleryTab({ projectId, apiBase, readOnly }: { projectId: string; apiBase: string; readOnly: boolean }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showPptModal, setShowPptModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  async function load() {
    const res = await fetch(`${apiBase}?kind=GALLERY_IMAGE`);
    setImages(await res.json());
  }

  useEffect(() => { load(); }, [apiBase]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "GALLERY_IMAGE");
      await fetch(apiBase, { method: "POST", body: fd });
    }
    await load();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this image?")) return;
    await fetch(`${apiBase}/${fileId}`, { method: "DELETE" });
    setImages((f) => f.filter((x) => x.id !== fileId));
  }

  async function persistOrder(next: GalleryImage[]) {
    setImages(next);
    await fetch(`${apiBase}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((f) => f.id) }),
    });
  }

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    persistOrder(next);
  }

  return (
    <div>
      {!readOnly && (
        <div className="mb-4 flex items-center gap-2">
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm font-medium border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload Images"}
          </button>
          {images.length > 0 && (
            <button
              onClick={() => setShowPptModal(true)}
              className="flex items-center gap-2 text-sm font-medium bg-blue-600 text-white px-3.5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Presentation className="w-4 h-4" /> Create PPT
            </button>
          )}
        </div>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No images uploaded.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              draggable={!readOnly}
              onDragStart={() => { dragIndex.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              className={cn(
                "relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50",
                !readOnly && "cursor-move"
              )}
            >
              <img src={`${apiBase}/${img.id}`} alt={img.originalName} className="w-full h-32 object-cover" />
              <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                {i + 1}
              </div>
              {!readOnly && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-start justify-end p-1 gap-1 opacity-0 group-hover:opacity-100">
                  <GripVertical className="w-4 h-4 text-white/80 mr-auto ml-1 mt-1" />
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="p-1 bg-white/90 hover:bg-white rounded text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showPptModal && (
        <CreatePptModal
          projectId={projectId}
          apiBase={apiBase}
          images={images}
          onClose={() => setShowPptModal(false)}
        />
      )}
    </div>
  );
}
