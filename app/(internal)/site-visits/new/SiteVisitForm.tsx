"use client";

import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

type Contact = { id: string; name: string; type: string };
type Project  = { id: string; title: string; projectNumber: string; category: { name: string } };

export default function SiteVisitForm({
  contacts, projects, action,
}: {
  contacts: Contact[]; projects: Project[]; action: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/projects?tab=Site+Visits" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">ERP System › Site Visits › Schedule</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Schedule Site Visit</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <form action={action} className="max-w-xl space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-pink-600" /> Visit Details
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Property *</label>
              <select name="projectId" required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">Select property…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.projectNumber})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact *</label>
              <select name="contactId" required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">Select contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date & Time *</label>
                <input name="scheduledAt" type="datetime-local" required
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Location</label>
                <input name="location" placeholder="e.g. Property site, Office"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea name="notes" rows={3}
                placeholder="Any pre-visit notes or preparation required…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit"
              className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Schedule Visit
            </button>
            <Link href="/projects?tab=Site+Visits"
              className="text-sm font-semibold text-gray-500 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
