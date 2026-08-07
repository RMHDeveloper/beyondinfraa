"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Field = { id: string; label: string; value: string | null };

export default function CustomFieldsSection({
  apiBase, readOnly = false,
}: {
  apiBase: string; // e.g. /api/projects/[id]/custom-fields
  readOnly?: boolean;
}) {
  const [fields, setFields] = useState<Field[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");

  async function load() {
    const res = await fetch(apiBase);
    if (res.ok) setFields(await res.json());
  }

  useEffect(() => { load(); }, [apiBase]);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setSaving(true);
    await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), value: newValue.trim() || null }),
    });
    setNewLabel(""); setNewValue(""); setAdding(false);
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

  function startEdit(f: Field) {
    setEditId(f.id); setEditLabel(f.label); setEditValue(f.value ?? "");
  }

  if (fields.length === 0 && readOnly) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Additional Notes & Fields</p>
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
            <input value={newValue} onChange={e => setNewValue(e.target.value)}
              placeholder="Value (e.g. No)"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newLabel.trim() || saving}
              className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : "Add"}
            </button>
            <button onClick={() => { setAdding(false); setNewLabel(""); setNewValue(""); }}
              className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-1.5">
          {fields.map(f => (
            <div key={f.id} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 group">
              {editId === f.id ? (
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
        <p className="text-xs text-gray-400 italic">No custom fields yet. Add one for anything the template doesn't cover — litigation status, special conditions, client notes, etc.</p>
      )}
    </div>
  );
}
