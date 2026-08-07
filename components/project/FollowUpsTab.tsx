"use client";

import { useEffect, useState } from "react";
import { Plus, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FollowUp = {
  id: string; description: string; dueAt: string | null;
  isDone: boolean; doneAt: string | null; createdAt: string;
};

export default function FollowUpsTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [desc, setDesc] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/followups`);
    setItems(await res.json());
  }

  useEffect(() => { load(); }, [projectId]);

  async function handleAdd() {
    if (!desc.trim()) return;
    setAdding(true);
    await fetch(`/api/projects/${projectId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc.trim(), dueAt: dueAt || null }),
    });
    setDesc(""); setDueAt(""); setShowForm(false);
    await load();
    setAdding(false);
  }

  async function toggleDone(item: FollowUp) {
    await fetch(`/api/projects/${projectId}/followups`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isDone: !item.isDone }),
    });
    setItems(prev => prev.map(f =>
      f.id === item.id ? { ...f, isDone: !f.isDone, doneAt: !f.isDone ? new Date().toISOString() : null } : f
    ));
  }

  const pending = items.filter(f => !f.isDone);
  const done = items.filter(f => f.isDone);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">Tasks</span>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What needs to be done?" rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
          <div className="flex gap-2 items-center">
            <input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-600" />
            <span className="text-xs text-gray-400">Due date (optional)</span>
            <button onClick={handleAdd} disabled={!desc.trim() || adding}
              className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-blue-700">
              {adding ? "Adding…" : "Add"}
            </button>
            <button onClick={() => { setShowForm(false); setDesc(""); setDueAt(""); }}
              className="px-3 py-2 border border-gray-200 text-sm text-gray-500 rounded-lg hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Check className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No tasks yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add tasks like "Call owner", "Get documents", or "Visit scheduled for Fri".</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-blue-600 font-bold hover:underline">
            + Add first task
          </button>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-1.5">
              {pending.map(f => {
                const isOverdue = f.dueAt ? new Date(f.dueAt) < new Date() : false;
                return (
                  <div key={f.id} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl">
                    <button onClick={() => toggleDone(f)}
                      className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5 hover:border-blue-500 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{f.description}</p>
                      {f.dueAt && (
                        <p className={cn("text-xs mt-0.5 flex items-center gap-1",
                          isOverdue ? "text-red-500" : "text-gray-400")}>
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                          Due {new Date(f.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {isOverdue && " — overdue"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {done.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Done</p>
              <div className="space-y-1.5">
                {done.map(f => (
                  <div key={f.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl opacity-60">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-sm text-gray-500 line-through">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
