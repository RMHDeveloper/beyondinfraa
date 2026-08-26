"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Calendar, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Note = {
  id: string; type: string; content: string; meetingAt: string | null; createdAt: string;
};

const SUMMARY_LIMIT = 160;

export default function NotesTab({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "meeting">("note");
  const [meetingAt, setMeetingAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<Note | null>(null);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/notes`);
    setNotes(await res.json());
  }

  useEffect(() => { load(); }, [projectId]);

  async function submit() {
    if (!content.trim()) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type, meetingAt: meetingAt || null }),
    });
    setContent(""); setMeetingAt(""); setType("note");
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="bg-gray-50 rounded-xl p-3">
        <div className="flex gap-2 mb-2">
          {(["note", "meeting"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={cn("text-xs font-medium px-3 py-1 rounded-full transition-colors",
                type === t ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200"
              )}>
              {t === "note" ? "Note" : "Meeting"}
            </button>
          ))}
        </div>
        {type === "meeting" && (
          <input type="datetime-local" value={meetingAt} onChange={(e) => setMeetingAt(e.target.value)}
            className="w-full mb-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
        )}
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === "note" ? "Add a note…" : "Meeting summary…"}
            rows={2}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submit(); }}
          />
          <button onClick={submit} disabled={!content.trim() || saving}
            className="self-end p-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feed */}
      {notes.length === 0 ? (
        <p className="text-sm text-gray-400">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => {
            const isLong = n.content.length > SUMMARY_LIMIT;
            const summary = isLong ? `${n.content.slice(0, SUMMARY_LIMIT).trimEnd()}…` : n.content;
            return (
              <div key={n.id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  {n.type === "meeting"
                    ? <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    : <MessageSquare className="w-3.5 h-3.5 text-gray-400" />}
                  <span className="text-xs font-medium text-gray-500">
                    {n.type === "meeting" ? "Meeting" : "Note"}
                  </span>
                  {n.meetingAt && (
                    <span className="text-xs text-blue-500">{new Date(n.meetingAt).toLocaleString()}</span>
                  )}
                  <span className="ml-auto text-xs text-gray-300">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary}</p>
                {isLong && (
                  <button
                    onClick={() => setViewing(n)}
                    className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View full {n.type === "meeting" ? "meeting" : "note"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setViewing(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {viewing.type === "meeting"
                  ? <Calendar className="w-4 h-4 text-blue-400" />
                  : <MessageSquare className="w-4 h-4 text-gray-400" />}
                <h2 className="text-sm font-bold text-gray-900">
                  {viewing.type === "meeting" ? "Meeting" : "Note"}
                </h2>
                {viewing.meetingAt && (
                  <span className="text-xs text-blue-500">{new Date(viewing.meetingAt).toLocaleString()}</span>
                )}
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewing.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
