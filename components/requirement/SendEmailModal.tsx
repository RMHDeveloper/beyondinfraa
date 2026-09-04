"use client";

import { useState } from "react";
import { X, Loader2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SendEmailModal({
  demandProjectId, auditLogId, defaultTo, defaultSubject, defaultBody, attachmentName,
  onDone, onClose,
}: {
  demandProjectId: string;
  auditLogId: string;
  defaultTo: string;
  defaultSubject: string;
  defaultBody: string;
  attachmentName: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${demandProjectId}/bulk-marketing-ppt/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditLogId, to, subject, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Send failed (${res.status})`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-900">Send Properties by Email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">To</label>
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)}
              placeholder="client@example.com"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{attachmentName}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-200">
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <button onClick={onClose} className="text-xs font-medium text-gray-600 border border-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-50 flex-shrink-0">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !to || !subject}
            className={cn(
              "flex items-center gap-2 text-xs font-bold text-white px-4 py-2 rounded-lg transition-colors flex-shrink-0",
              sending || !to || !subject ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {sending ? "Sending…" : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
