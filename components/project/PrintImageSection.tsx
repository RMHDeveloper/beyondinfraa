"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Download, Trash2, Loader2, Star } from "lucide-react";

type PrintImage = {
  id: string; originalName: string; sizeBytes: number; uploadedAt: string;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function PrintImageSection({
  apiBase, readOnly, onChange, label = "Print Image",
}: { apiBase: string; readOnly: boolean; onChange?: () => void; label?: string }) {
  const [images, setImages] = useState<PrintImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`${apiBase}?kind=PRINT_IMAGE`);
    const imgs: PrintImage[] = await res.json();
    setImages(imgs);
    setSelectedIndex(0);
    onChange?.();
  }

  useEffect(() => { load(); }, [apiBase]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "PRINT_IMAGE");
      await fetch(apiBase, { method: "POST", body: fd });
    }
    await load();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this image?")) return;
    await fetch(`${apiBase}/${fileId}`, { method: "DELETE" });
    await load();
  }

  async function handleSetPrimary(index: number) {
    if (index === 0 || settingPrimary) return;
    setSettingPrimary(true);
    const reordered = [images[index].id, ...images.filter((_, i) => i !== index).map((f) => f.id)];
    await fetch(`${apiBase}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered }),
    });
    await load();
    setSettingPrimary(false);
  }

  const selected = images[selectedIndex];

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        {!readOnly && (
          <>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-medium border border-gray-300 text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? "Uploading…" : "Upload Image"}
            </button>
          </>
        )}
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">
          No image uploaded. The first image uploaded here is used as this property&apos;s photo on the print/PDF view.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
            <img src={`${apiBase}/${selected.id}`} alt={selected.originalName} className="w-full h-full object-cover" />
            {selectedIndex === 0 && (
              <span className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                <Star className="w-3 h-3 fill-current" /> Primary
              </span>
            )}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <a href={`${apiBase}/${selected.id}`} download={selected.originalName}
                className="p-1.5 bg-white/90 text-gray-700 hover:text-gray-900 rounded-full shadow">
                <Download className="w-3.5 h-3.5" />
              </a>
              {!readOnly && (
                <button onClick={() => handleDelete(selected.id)}
                  className="p-1.5 bg-white/90 text-gray-700 hover:text-red-500 rounded-full shadow">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 truncate">
            {selected.originalName} · {formatBytes(selected.sizeBytes)}
          </p>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((f, i) => (
                <button key={f.id} onClick={() => setSelectedIndex(i)}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === selectedIndex ? "border-blue-600" : "border-transparent hover:border-gray-300"
                  }`}>
                  <img src={`${apiBase}/${f.id}`} alt={f.originalName} className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute bottom-0 right-0 bg-blue-600 rounded-tl px-1"><Star className="w-2.5 h-2.5 text-white fill-current" /></span>}
                </button>
              ))}
            </div>
          )}

          {!readOnly && selectedIndex !== 0 && (
            <button onClick={() => handleSetPrimary(selectedIndex)} disabled={settingPrimary}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50">
              {settingPrimary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
              Set as primary
            </button>
          )}
        </div>
      )}
    </div>
  );
}
