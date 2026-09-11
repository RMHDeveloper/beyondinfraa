"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, AlertCircle, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FollowUp = {
  id: string; description: string; dueAt: Date | string | null; isDone: boolean;
  project: { id: string; title: string; category: { name: string } };
};

type ProjectOption = { id: string; title: string; category: { name: string } };

const SECTOR_COLORS: Record<string, string> = {
  Residential: "#2563eb", Commercial: "#d97706",
  Industrial: "#7c3aed", Redevelopment: "#0d9488", "Special Projects": "#0d9488",
};

function toDateInputValue(d: Date | string | null) {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

export default function TasksClient({ followUps: initial, projects }: { followUps: FollowUp[]; projects: ProjectOption[] }) {
  const [followUps, setFollowUps] = useState(initial);
  const [filter, setFilter] = useState<"All" | "Pending" | "Overdue" | "Done">("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueAt, setNewDueAt] = useState("");
  const [creating, setCreating] = useState(false);
  const now = new Date();

  async function toggleDone(id: string, isDone: boolean) {
    setFollowUps((prev) => prev.map((f) => f.id === id ? { ...f, isDone: !isDone } : f));
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !isDone }),
    });
  }

  async function updateDueAt(id: string, dueAt: string) {
    if (!dueAt) { setEditingId(null); return; }
    setFollowUps((prev) => prev.map((f) => f.id === id ? { ...f, dueAt } : f));
    setEditingId(null);
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueAt }),
    });
  }

  async function createTask() {
    if (!newProjectId || !newDescription.trim() || !newDueAt) return;
    setCreating(true);
    const res = await fetch(`/api/projects/${newProjectId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: newDescription, dueAt: newDueAt }),
    });
    setCreating(false);
    if (!res.ok) return;
    const created = await res.json();
    const project = projects.find((p) => p.id === newProjectId);
    if (project) {
      setFollowUps((prev) => [...prev, { ...created, project }]);
    }
    setShowNewForm(false);
    setNewProjectId("");
    setNewDescription("");
    setNewDueAt("");
  }

  const withStatus = followUps.map((f) => {
    const due = f.dueAt ? new Date(f.dueAt) : null;
    const status = f.isDone ? "Done" : (due && due < now) ? "Overdue" : "Pending";
    return { ...f, status };
  });

  const filtered = filter === "All" ? withStatus : withStatus.filter((f) => f.status === filter);

  const counts = {
    Pending: withStatus.filter((f) => f.status === "Pending").length,
    Overdue: withStatus.filter((f) => f.status === "Overdue").length,
    Done: withStatus.filter((f) => f.status === "Done").length,
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">ERP System › Tasks & Follow-ups</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Tasks & Follow-ups</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track action items across all properties.</p>
        </div>
        <button onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> New Task
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
        {showNewForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Task</p>
              <button onClick={() => setShowNewForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white sm:col-span-2">
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.category.name})</option>
                ))}
              </select>
              <input type="date" value={newDueAt} onChange={(e) => setNewDueAt(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button onClick={createTask} disabled={creating || !newProjectId || !newDescription.trim() || !newDueAt}
                className="bg-blue-600 text-white text-sm font-bold rounded-lg px-3 py-2 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {creating ? "Adding…" : "Add Task"}
              </button>
              <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Task description…"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-4" />
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          {[
            { label: "Pending", count: counts.Pending, color: "#d97706", bg: "#fffbeb", icon: Clock },
            { label: "Overdue", count: counts.Overdue, color: "#dc2626", bg: "#fef2f2", icon: XCircle },
            { label: "Done",    count: counts.Done,    color: "#059669", bg: "#ecfdf5", icon: CheckCircle2 },
          ].map(({ label, count, color, bg, icon: Icon }) => (
            <button key={label} onClick={() => setFilter(filter === label ? "All" : label as typeof filter)}
              className={cn("bg-white rounded-xl border p-4 text-left transition-colors hover:border-gray-300",
                filter === label ? "border-2" : "border-gray-200")}
              style={filter === label ? { borderColor: color } : undefined}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" style={{ color }} />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
              </div>
              <p className="text-3xl font-bold" style={{ color }}>{count}</p>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <th className="px-4 py-3 w-8" />
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Task</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Project</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Due Date</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((f) => {
                const catColor = SECTOR_COLORS[f.project.category.name] ?? "#64748b";
                const statusStyles = {
                  Pending: "bg-amber-50 text-amber-700",
                  Overdue: "bg-red-50 text-red-700",
                  Done: "bg-green-50 text-green-700",
                };
                const StatusIcon = f.status === "Done" ? CheckCircle2 : f.status === "Overdue" ? XCircle : Clock;
                return (
                  <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleDone(f.id, f.isDone)}
                        title={f.isDone ? "Mark as pending" : "Mark as done"}
                        className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                          f.isDone
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-green-500")}>
                        {f.isDone && <Check className="w-3 h-3" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className={cn("font-medium text-gray-800", f.isDone && "line-through text-gray-400")}>{f.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${f.project.id}?tab=Tasks`} className="hover:text-blue-600 transition-colors">
                        <p className="font-semibold text-gray-800 truncate max-w-[200px]">{f.project.title}</p>
                        <p className="text-[10px] mt-0.5 font-medium" style={{ color: catColor }}>{f.project.category.name}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {editingId === f.id ? (
                        <input type="date" autoFocus defaultValue={toDateInputValue(f.dueAt)}
                          onBlur={(e) => updateDueAt(f.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") updateDueAt(f.id, (e.target as HTMLInputElement).value);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      ) : (
                        <button onClick={() => setEditingId(f.id)}
                          className="hover:text-blue-600 hover:underline transition-colors">
                          {f.dueAt ? new Date(f.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Set date"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", statusStyles[f.status as keyof typeof statusStyles])}>
                        <StatusIcon className="w-3 h-3" /> {f.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p>No {filter === "All" ? "" : filter.toLowerCase()} tasks.</p>
                  {filter === "All" && (
                    <p className="text-xs mt-1">Add a task above, or from any Property page → Tasks tab.</p>
                  )}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
