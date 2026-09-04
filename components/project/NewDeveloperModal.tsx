"use client";

import { useState } from "react";
import { blurOnWheel } from "@/lib/utils";

export default function NewDeveloperModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (developerId: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [preferredProjectSize, setPreferredProjectSize] = useState("");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [completedProjects, setCompletedProjects] = useState("");
  const [ongoingProjects, setOngoingProjects] = useState("");
  const [financialCapability, setFinancialCapability] = useState("");
  const [internalRating, setInternalRating] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim()) { setError("Name is required"); return; }
    setError("");
    setSaving(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, type: "DEVELOPER", phone, email, company, notes,
        reraNumber, preferredProjectSize, preferredLocations,
        completedProjects, ongoingProjects, financialCapability, internalRating,
      }),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json(); setError(e.error ?? "Failed to create developer"); return; }
    const data = await res.json();
    onCreated(data.developer.id);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold text-gray-900">New Developer</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Sharma"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+91 98765 43210"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="rahul@email.com"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Company / Organization</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. ABC Builders Pvt. Ltd."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any additional details…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none" />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Developer Profile</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">RERA Number</label>
              <input value={reraNumber} onChange={e => setReraNumber(e.target.value)} placeholder="e.g. TN/29/Building/0123/2024"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Project Size</label>
              <input value={preferredProjectSize} onChange={e => setPreferredProjectSize(e.target.value)} placeholder="e.g. 10,000–50,000 sqft"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Locations</label>
              <input value={preferredLocations} onChange={e => setPreferredLocations(e.target.value)} placeholder="e.g. Adyar, Anna Nagar, T Nagar (comma-separated)"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Completed Projects</label>
              <input value={completedProjects} onChange={e => setCompletedProjects(e.target.value)} type="number" min="0" placeholder="0" onWheel={blurOnWheel}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Ongoing Projects</label>
              <input value={ongoingProjects} onChange={e => setOngoingProjects(e.target.value)} type="number" min="0" placeholder="0" onWheel={blurOnWheel}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Financial Capability</label>
              <input value={financialCapability} onChange={e => setFinancialCapability(e.target.value)} placeholder="e.g. Strong, self-funded"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Internal Rating (1–5)</label>
              <input value={internalRating} onChange={e => setInternalRating(e.target.value)} type="number" min="1" max="5" placeholder="e.g. 4" onWheel={blurOnWheel}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <div className="flex gap-3">
          <button onClick={submit} disabled={saving}
            className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Developer"}
          </button>
          <button onClick={onClose} className="border border-gray-200 text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
