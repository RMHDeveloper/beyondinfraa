"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Building2 } from "lucide-react";

const CONTACT_TYPES = [
  { value: "OWNER",                  label: "Owner" },
  { value: "BUYER",                  label: "Buyer" },
  { value: "TENANT",                 label: "Tenant" },
  { value: "DEVELOPER",              label: "Developer" },
  { value: "BROKER",                 label: "Broker" },
  { value: "ARCHITECT",              label: "Architect" },
  { value: "LEGAL_CONSULTANT",       label: "Legal Consultant" },
  { value: "TECHNICAL_CONSULTANT",   label: "Technical Consultant" },
  { value: "ASSOCIATION_MEMBER",     label: "Association Member" },
  { value: "COMPANY",                label: "Company" },
  { value: "OTHER",                  label: "Other" },
];

type Contact = {
  id: string; name: string; type: string; phone: string | null; email: string | null;
  company: string | null; notes: string | null; isActive: boolean;
};
type DeveloperProfile = {
  reraNumber: string | null; preferredProjectSize: string | null;
  preferredLocations: unknown; financialCapability: string | null;
  completedProjects: number | null; ongoingProjects: number | null; internalRating: number | null;
} | null;

export default function EditContactForm({
  contact, developerProfile, action,
}: { contact: Contact; developerProfile: DeveloperProfile; action: (fd: FormData) => Promise<void> }) {
  const [type, setType] = useState(contact.type);
  const isDeveloper = type === "DEVELOPER";
  const preferredLocations = Array.isArray(developerProfile?.preferredLocations)
    ? (developerProfile!.preferredLocations as string[]).join(", ")
    : "";

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href={`/contacts/${contact.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">ERP › Contacts › {contact.name} › Edit</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Edit Contact</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-6 py-6">
        <form action={action} className="max-w-xl space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Contact Information
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input name="name" required defaultValue={contact.name}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Type *</label>
              <select name="type" value={type} onChange={(e) => setType(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                {CONTACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input name="phone" type="tel" defaultValue={contact.phone ?? ""}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input name="email" type="email" defaultValue={contact.email ?? ""}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Company / Organization</label>
              <input name="company" defaultValue={contact.company ?? ""}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select name="isActive" defaultValue={contact.isActive ? "true" : "false"}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea name="notes" rows={3} defaultValue={contact.notes ?? ""}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          {isDeveloper && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Developer Profile
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">RERA Number</label>
                  <input name="reraNumber" defaultValue={developerProfile?.reraNumber ?? ""} placeholder="e.g. TN/29/Building/0123/2024"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Project Size</label>
                  <input name="preferredProjectSize" defaultValue={developerProfile?.preferredProjectSize ?? ""} placeholder="e.g. 10,000–50,000 sqft"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Locations</label>
                  <input name="preferredLocations" defaultValue={preferredLocations} placeholder="e.g. Adyar, Anna Nagar, T Nagar (comma-separated)"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Completed Projects</label>
                  <input name="completedProjects" type="number" min="0" defaultValue={developerProfile?.completedProjects ?? 0}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ongoing Projects</label>
                  <input name="ongoingProjects" type="number" min="0" defaultValue={developerProfile?.ongoingProjects ?? 0}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Financial Capability</label>
                  <input name="financialCapability" defaultValue={developerProfile?.financialCapability ?? ""} placeholder="e.g. Strong, self-funded"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Internal Rating (1–5)</label>
                  <input name="internalRating" type="number" min="1" max="5" defaultValue={developerProfile?.internalRating ?? ""}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit"
              className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
            <Link href={`/contacts/${contact.id}`}
              className="text-sm font-semibold text-gray-500 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
