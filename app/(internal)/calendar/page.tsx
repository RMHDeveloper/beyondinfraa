"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, ClipboardList, MapPin, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  type: "followup" | "sitevisit" | "meeting";
  date: string;
  title: string;
  done: boolean;
  projectId: string | null;
  projectTitle: string | null;
};

const TYPE_CFG: Record<CalendarEvent["type"], { label: string; color: string; bg: string; icon: typeof ClipboardList }> = {
  followup: { label: "Task / Follow-up", color: "#2563eb", bg: "#eff6ff", icon: ClipboardList },
  sitevisit: { label: "Site Visit", color: "#0891b2", bg: "#f0f9ff", icon: MapPin },
  meeting: { label: "Meeting", color: "#7c3aed", bg: "#f5f3ff", icon: Users },
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(ymd(today));

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?start=${gridStart.toISOString()}&end=${gridEnd.toISOString()}`)
      .then(r => r.json())
      .then(setEvents)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const key = ymd(new Date(e.date));
      (map[key] ??= []).push(e);
    }
    return map;
  }, [events]);

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) days.push(new Date(d));

  const selectedEvents = eventsByDay[selectedDate] ?? [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP System › Calendar</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" /> Calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-bold text-gray-900 w-36 text-center">
            {cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(ymd(today)); }}
            className="text-xs font-bold border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">
            Today
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-6 space-y-4">
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[10px] font-semibold text-gray-500">
          {Object.values(TYPE_CFG).map(cfg => (
            <span key={cfg.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} /> {cfg.label}
            </span>
          ))}
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-300" />}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map(d => {
            const key = ymd(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = key === ymd(today);
            const isSelected = key === selectedDate;
            const dayEvents = eventsByDay[key] ?? [];
            return (
              <button key={key} onClick={() => setSelectedDate(key)}
                className={cn(
                  "aspect-square sm:aspect-auto sm:h-20 rounded-lg border p-1 sm:p-2 flex flex-col items-center sm:items-start transition-colors",
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50",
                  !inMonth && "opacity-40"
                )}>
                <span className={cn(
                  "text-[11px] sm:text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full",
                  isToday ? "bg-blue-600 text-white" : "text-gray-700"
                )}>
                  {d.getDate()}
                </span>
                <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                  {dayEvents.slice(0, 4).map(e => (
                    <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_CFG[e.type].color }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected day list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-900 text-sm">
              {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-gray-400">{selectedEvents.length} {selectedEvents.length === 1 ? "item" : "items"}</p>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Nothing scheduled this day.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedEvents.map(e => {
                const cfg = TYPE_CFG[e.type];
                const Icon = cfg.icon;
                const href = e.type === "followup"
                  ? `/projects/${e.projectId}?tab=Tasks`
                  : e.type === "meeting"
                  ? `/projects/${e.projectId}?tab=Meetings`
                  : `/site-visits`;
                return (
                  <Link key={e.id} href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold text-gray-900 truncate", e.done && "line-through text-gray-400")}>{e.title}</p>
                      <p className="text-xs text-gray-400 truncate">{e.projectTitle ?? "No property linked"} · {new Date(e.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
