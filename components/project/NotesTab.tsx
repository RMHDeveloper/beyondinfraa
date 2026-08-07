"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Calendar, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Note = {
  id: string; type: string; content: string; meetingAt: string | null; createdAt: string;
};

export default function NotesTab({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [type, setType] = useState<"note" | "meeting">("note");
  const [meetingAt, setMeetingAt] = useState("");
  const [saving, setSaving] = useState(false);

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
          {notes.map((n) => (
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
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
