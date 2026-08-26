"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Download, Trash2, Loader2 } from "lucide-react";

type CustomFieldImage = {
  id: string; originalName: string; sizeBytes: number; uploadedAt: string;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function slugify(title: string) {
  return title.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "") || "project";
}

export default function CustomFieldImagesSection({
  apiBase, projectTitle, readOnly, onChange,
}: { apiBase: string; projectTitle: string; readOnly: boolean; onChange?: () => void }) {
  const [images, setImages] = useState<CustomFieldImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`${apiBase}?kind=CUSTOM_FIELD_IMAGE`);
    setImages(await res.json());
    onChange?.();
  }

  useEffect(() => { load(); }, [apiBase]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    const base = slugify(projectTitle);
    let next = images.length;
    for (const file of files) {
      next += 1;
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      const labeled = new File([file], `${base}${next}${ext}`, { type: file.type });
      const fd = new FormData();
      fd.append("file", labeled);
      fd.append("kind", "CUSTOM_FIELD_IMAGE");
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
    onChange?.();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Print Photo</p>
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
          No photo uploaded. The first image uploaded here is used as this property&apos;s photo on the print/PDF view. Auto-labeled as {slugify(projectTitle)}1.jpg, {slugify(projectTitle)}2.jpg, etc.
        </p>
      ) : (
        <div className="space-y-2">
          {images.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg group">
              <img src={`${apiBase}/${f.id}`} alt={f.originalName} className="w-10 h-10 object-cover rounded flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.originalName}</p>
                <p className="text-xs text-gray-400">
                  {formatBytes(f.sizeBytes)} · {new Date(f.uploadedAt).toLocaleDateString()}
                  {i === 0 && <span className="ml-2 text-blue-600 font-semibold">Used in print</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={`${apiBase}/${f.id}`} download={f.originalName} className="p-1.5 text-gray-400 hover:text-gray-900 rounded">
                  <Download className="w-3.5 h-3.5" />
                </a>
                {!readOnly && (
                  <button onClick={() => handleDelete(f.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
