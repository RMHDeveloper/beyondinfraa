"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Status = { id: string; name: string; slug: string; color: string; sortOrder: number };
type Tag = { id: string; name: string; color: string };

export default function StatusesPage() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [newStatus, setNewStatus] = useState({ name: "", slug: "", color: "#6B7280" });
  const [addingStatus, setAddingStatus] = useState(false);
  const [newTag, setNewTag] = useState({ name: "", color: "#6B7280" });
  const [addingTag, setAddingTag] = useState(false);

  function toSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function loadStatuses() {
    const res = await fetch("/api/settings/statuses");
    setStatuses(await res.json());
  }
  async function loadTags() {
    const res = await fetch("/api/settings/tags");
    setTags(await res.json());
  }
  useEffect(() => { loadStatuses(); loadTags(); }, []);

  async function saveStatus() {
    await fetch("/api/settings/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStatus),
    });
    setNewStatus({ name: "", slug: "", color: "#6B7280" });
    setAddingStatus(false);
    loadStatuses();
  }

  async function updateStatus() {
    if (!editingStatus) return;
    await fetch("/api/settings/statuses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingStatus.id, name: editingStatus.name, color: editingStatus.color }),
    });
    setEditingStatus(null);
    loadStatuses();
  }

  async function deleteStatus(id: string) {
    if (!confirm("Delete this status?")) return;
    await fetch("/api/settings/statuses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadStatuses();
  }

  async function saveTag() {
    await fetch("/api/settings/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTag),
    });
    setNewTag({ name: "", color: "#6B7280" });
    setAddingTag(false);
    loadTags();
  }

  async function deleteTag(id: string) {
    await fetch("/api/settings/tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadTags();
  }

  return (
    <div className="max-w-2xl space-y-10">
      {/* Statuses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Project Statuses</h2>
          <button onClick={() => setAddingStatus(true)} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {statuses.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              {editingStatus?.id === s.id ? (
                <>
                  <input type="color" value={editingStatus.color} onChange={(e) => setEditingStatus((p) => p && ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <input className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1 text-sm" value={editingStatus.name} onChange={(e) => setEditingStatus((p) => p && ({ ...p, name: e.target.value }))} />
                  <button onClick={updateStatus}><Check className="w-4 h-4 text-green-600" /></button>
                  <button onClick={() => setEditingStatus(null)}><X className="w-4 h-4 text-gray-400" /></button>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-sm font-medium text-gray-900 flex-1">{s.name}</span>
                  <span className="font-mono text-xs text-gray-400">{s.slug}</span>
                  <button onClick={() => setEditingStatus(s)} className="text-gray-400 hover:text-gray-700"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteStatus(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}

          {addingStatus && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50">
              <input type="color" value={newStatus.color} onChange={(e) => setNewStatus((p) => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0" />
              <input className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1 text-sm" placeholder="Status name" value={newStatus.name} onChange={(e) => setNewStatus({ name: e.target.value, slug: toSlug(e.target.value), color: newStatus.color })} autoFocus />
              <input className="w-32 border border-gray-300 rounded-lg px-2.5 py-1 text-sm font-mono" placeholder="slug" value={newStatus.slug} onChange={(e) => setNewStatus((p) => ({ ...p, slug: e.target.value }))} />
              <button onClick={saveStatus} className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg">Save</button>
              <button onClick={() => setAddingStatus(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Tags</h2>
          <button onClick={() => setAddingTag(true)} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: t.color + "20", color: t.color }}>
              {t.name}
              <button onClick={() => deleteTag(t.id)} className="hover:opacity-70 ml-1"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>

        {addingTag && (
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <input type="color" value={newTag.color} onChange={(e) => setNewTag((p) => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border-0" />
            <input className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1 text-sm" placeholder="Tag name" value={newTag.name} onChange={(e) => setNewTag((p) => ({ ...p, name: e.target.value }))} autoFocus />
            <button onClick={saveTag} className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg">Save</button>
            <button onClick={() => setAddingTag(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
