"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";

type Contact = { id: string; name: string; type: string };
type Project  = { id: string; title: string; projectNumber: string; category: { name: string } };
type Category = { id: string; name: string };

const SEGMENT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  Land: [
    { value: "BUY", label: "Buy" },
    { value: "SELL", label: "Sell" },
  ],
  "Special Projects": [
    { value: "REDEVELOPMENT", label: "Redevelopment" },
    { value: "JV", label: "JV" },
  ],
};
const DEFAULT_SEGMENT_OPTIONS = [
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "RENT", label: "Rent" },
];

export default function SiteVisitForm({
  contacts, projects, categories, action,
}: {
  contacts: Contact[]; projects: Project[]; categories: Category[]; action: (fd: FormData) => Promise<void>;
}) {
  const [categoryName, setCategoryName] = useState("");
  const segmentOptions = SEGMENT_OPTIONS[categoryName] ?? DEFAULT_SEGMENT_OPTIONS;

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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Property</label>
              <select name="projectId" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">Select property… (optional)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.projectNumber})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact</label>
              <select name="contactId" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">Select contact… (optional)</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select name="categoryId"
                  onChange={(e) => setCategoryName(e.target.selectedOptions[0]?.dataset.name ?? "")}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} data-name={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Segment</label>
                <select name="segment" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select…</option>
                  {segmentOptions.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date & Time</label>
                <input name="scheduledAt" type="datetime-local"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Meeting Location</label>
                <input name="location" placeholder="e.g. Property site, Office"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Google Maps Pin</label>
              <input name="mapsLink" placeholder="https://maps.google.com/?q=…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
