"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Upload, X, Loader2 } from "lucide-react";

type DevFile = {
  id: string; originalName: string; sizeBytes: number; uploadedAt: string;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function DeveloperProposalFiles({ developerProposalId, apiBase: apiBaseProp, uploadLabel = "Upload Document" }: { developerProposalId?: string; apiBase?: string; uploadLabel?: string }) {
  const [files, setFiles] = useState<DevFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBase = apiBaseProp ?? `/api/developer-proposals/${developerProposalId}/files`;

  async function load() {
    const res = await fetch(apiBase);
    setFiles(await res.json());
  }

  useEffect(() => { load(); }, [apiBase]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    await fetch(apiBase, { method: "POST", body: fd });
    await load();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this document?")) return;
    await fetch(`${apiBase}/${fileId}`, { method: "DELETE" });
    setFiles((f) => f.filter((x) => x.id !== fileId));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
      <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      {files.map((f) => (
        <span key={f.id} className="group flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 pl-2 pr-1 py-1 rounded-full">
          <a href={`${apiBase}/${f.id}`} download={f.originalName} className="hover:underline" title={formatBytes(f.sizeBytes)}>
            {f.originalName}
          </a>
          <button onClick={() => handleDelete(f.id)} className="text-gray-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 text-[10px] font-bold text-gray-500 border border-gray-200 px-2 py-1 rounded-full hover:bg-gray-50 disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {uploading ? "Uploading…" : uploadLabel}
      </button>
    </div>
  );
}
