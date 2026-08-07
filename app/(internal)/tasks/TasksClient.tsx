"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FollowUp = {
  id: string; description: string; dueAt: Date | string | null; isDone: boolean;
  project: { id: string; title: string; category: { name: string } };
};

const SECTOR_COLORS: Record<string, string> = {
  Residential: "#2563eb", Commercial: "#d97706",
  Industrial: "#7c3aed", Redevelopment: "#0d9488",
};

export default function TasksClient({ followUps: initial }: { followUps: FollowUp[] }) {
  const [followUps, setFollowUps] = useState(initial);
  const [filter, setFilter] = useState<"All" | "Pending" | "Overdue" | "Done">("All");
  const now = new Date();

  async function toggleDone(id: string, isDone: boolean) {
    setFollowUps((prev) => prev.map((f) => f.id === id ? { ...f, isDone: !isDone } : f));
    await fetch(`/api/followups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: !isDone }),
    });
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
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex-shrink-0">
        <p className="text-xs text-gray-400">ERP System › Tasks & Follow-ups</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">Tasks & Follow-ups</h1>
        <p className="text-xs text-gray-400 mt-0.5">Track action items across all properties. Add tasks from any property page.</p>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
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
                      {f.dueAt ? new Date(f.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
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
                    <p className="text-xs mt-1">Add tasks from any Property page → Tasks tab.</p>
                  )}
                </td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
