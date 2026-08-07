"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectFile = {
  id: string; fileName: string; originalName: string;
  mimeType: string; sizeBytes: number; uploadedAt: string;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function FilesTab({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/files`);
    setFiles(await res.json());
  }

  useEffect(() => { load(); }, [projectId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/projects/${projectId}/files`, { method: "POST", body: fd });
    await load();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this file?")) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    setFiles((f) => f.filter((x) => x.id !== fileId));
  }

  return (
    <div>
      {!readOnly && (
        <div className="mb-4">
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm font-medium border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload File"}
          </button>
        </div>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No files uploaded.</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{f.originalName}</p>
                <p className="text-xs text-gray-400">{formatBytes(f.sizeBytes)} · {new Date(f.uploadedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={`/api/projects/${projectId}/files/${f.id}`}
                  download={f.originalName}
                  className="p-1.5 text-gray-400 hover:text-gray-900 rounded"
                >
                  <Download className="w-4 h-4" />
                </a>
                {!readOnly && (
                  <button onClick={() => handleDelete(f.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 className="w-4 h-4" />
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
