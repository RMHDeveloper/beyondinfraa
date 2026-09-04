"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Upload, Download, Loader2, Eye, EyeOff } from "lucide-react";

type Field = {
  id: string;
  label: string;
  value: string | null;
  type: "TEXT" | "IMAGE";
  showToClient: boolean;
  file: { id: string; fileName: string; mimeType: string; originalName: string } | null;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function AdditionalFieldsSection({
  apiBase, filesApiBase, readOnly = false,
}: {
  apiBase: string; // e.g. /api/projects/[id]/custom-fields
  filesApiBase: string; // e.g. /api/projects/[id]/files
  readOnly?: boolean;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<"TEXT" | "IMAGE">("TEXT");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newShowToClient, setNewShowToClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<string | null>(null);

  async function load() {
    const res = await fetch(apiBase);
    if (res.ok) setFields(await res.json());
  }

  useEffect(() => { load(); }, [apiBase]);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    if (newType === "IMAGE" && !newFile) return;
    setSaving(true);
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel.trim(),
        type: newType,
        showToClient: newShowToClient,
        ...(newType === "TEXT" && newValue.trim() ? { value: newValue.trim() } : {}),
      }),
    });
    const created: Field = await res.json();

    if (newType === "IMAGE" && newFile) {
      const fd = new FormData();
      fd.append("file", newFile);
      fd.append("kind", "CUSTOM_FIELD_IMAGE");
      const uploadRes = await fetch(filesApiBase, { method: "POST", body: fd });
      const uploaded = await uploadRes.json();
      await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: created.id, fileId: uploaded.id }),
      });
    }

    setNewLabel(""); setNewValue(""); setNewType("TEXT"); setNewFile(null); setNewShowToClient(false); setAdding(false);
    await load();
    setSaving(false);
  }

  async function handleUpdate(id: string) {
    await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: editLabel.trim(), value: editValue.trim() || null }),
    });
    setEditId(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this field?")) return;
    await fetch(apiBase, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  async function toggleShowToClient(f: Field) {
    setFields(prev => prev.map(x => x.id === f.id ? { ...x, showToClient: !x.showToClient } : x));
    await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id, showToClient: !f.showToClient }),
    });
  }

  function startEdit(f: Field) {
    setEditId(f.id); setEditLabel(f.label); setEditValue(f.value ?? "");
  }

  function startUpload(id: string) {
    uploadTargetId.current = id;
    uploadInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = uploadTargetId.current;
    if (!file || !targetId) return;
    setUploadingId(targetId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "CUSTOM_FIELD_IMAGE");
    const uploadRes = await fetch(filesApiBase, { method: "POST", body: fd });
    const uploaded = await uploadRes.json();
    await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: targetId, fileId: uploaded.id }),
    });
    await load();
    setUploadingId(null);
    uploadTargetId.current = null;
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  if (fields.length === 0 && readOnly) return null;

  return (
    <div className="mt-4">
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Additional Fields</p>
        {!readOnly && (
          <button onClick={() => setAdding(v => !v)}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800">
            <Plus className="w-3 h-3" /> Add Field
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 space-y-2">
          <div className="flex gap-2">
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="Field name (e.g. Pending Litigation)"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
              <button onClick={() => setNewType("TEXT")}
                className={`text-xs font-medium px-3 py-1.5 ${newType === "TEXT" ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}>
                Text
              </button>
              <button onClick={() => setNewType("IMAGE")}
                className={`text-xs font-medium px-3 py-1.5 ${newType === "IMAGE" ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}>
                Image
              </button>
            </div>
          </div>
          {newType === "TEXT" ? (
            <input value={newValue} onChange={e => setNewValue(e.target.value)}
              placeholder="Value"
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
          ) : (
            <input type="file" accept="image/*" onChange={e => setNewFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-gray-600 file:mr-2 file:text-xs file:font-medium file:bg-white file:border file:border-gray-200 file:rounded-lg file:px-2.5 file:py-1 file:cursor-pointer" />
          )}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newLabel.trim() || (newType === "IMAGE" && !newFile) || saving}
              className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setAdding(false); setNewLabel(""); setNewValue(""); setNewType("TEXT"); setNewFile(null); setNewShowToClient(false); }}
              className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer w-fit">
            <input type="checkbox" checked={newShowToClient} onChange={e => setNewShowToClient(e.target.checked)}
              className="rounded border-gray-300" />
            Visible to client
          </label>
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-1.5">
          {fields.map(f => (
            <div key={f.id} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 group">
              {f.type === "IMAGE" ? (
                <>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex-shrink-0 w-36 truncate">{f.label}</span>
                  {f.file ? (
                    <>
                      <img src={`${filesApiBase}/${f.file.id}`} alt={f.file.originalName} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                      <span className="text-xs text-gray-500 flex-1 truncate">{f.file.originalName}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300 italic flex-1">
                      {uploadingId === f.id ? "Uploading…" : "no image uploaded"}
                    </span>
                  )}
                  {!readOnly && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleShowToClient(f)}
                        className={`p-1 ${f.showToClient ? "text-blue-600" : "text-gray-300"} hover:text-blue-600`}
                        title={f.showToClient ? "Visible to client — click to hide" : "Hidden from client — click to show"}>
                        {f.showToClient ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => startUpload(f.id)} disabled={uploadingId === f.id}
                        className="p-1 text-gray-400 hover:text-blue-600" title={f.file ? "Replace" : "Upload"}>
                        {uploadingId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      </button>
                      {f.file && (
                        <a href={`${filesApiBase}/${f.file.id}`} download={f.file.originalName} className="p-1 text-gray-400 hover:text-gray-900">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleDelete(f.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </>
              ) : editId === f.id ? (
                <>
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <input value={editValue} onChange={e => setEditValue(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <button onClick={() => handleUpdate(f.id)} className="text-green-600 hover:text-green-800"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex-shrink-0 w-36 truncate">{f.label}</span>
                  <span className="text-xs text-gray-800 flex-1">{f.value || <span className="text-gray-300 italic">not filled</span>}</span>
                  {!readOnly && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleShowToClient(f)}
                        className={`${f.showToClient ? "text-blue-600" : "text-gray-300"} hover:text-blue-600`}
                        title={f.showToClient ? "Visible to client — click to hide" : "Hidden from client — click to show"}>
                        {f.showToClient ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button onClick={() => startEdit(f)} className="text-gray-400 hover:text-blue-600"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(f.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && !adding && !readOnly && (
        <p className="text-xs text-gray-400 italic">No additional fields yet. Add one for anything the template doesn't cover — litigation status, special conditions, extra photos, etc.</p>
      )}
    </div>
  );
}
