"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";

const CONTACT_TYPES = [
  { value: "OWNER", label: "Owner" },
  { value: "BUYER", label: "Buyer" },
  { value: "TENANT", label: "Tenant" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "BROKER", label: "Broker" },
  { value: "ARCHITECT", label: "Architect" },
  { value: "LEGAL_CONSULTANT", label: "Legal Consultant" },
  { value: "TECHNICAL_CONSULTANT", label: "Technical Consultant" },
  { value: "ASSOCIATION_MEMBER", label: "Association Member" },
  { value: "COMPANY", label: "Company" },
  { value: "OTHER", label: "Other" },
];

export default function NewContactForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/contacts" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">ERP System › Contacts › New</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Add Contact</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <form ref={ref} action={action} className="max-w-xl space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Contact Information
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input name="name" required placeholder="e.g. Rahul Sharma"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Type *</label>
              <select name="type" defaultValue="BUYER"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                {CONTACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input name="phone" type="tel" placeholder="+91 98765 43210"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input name="email" type="email" placeholder="rahul@email.com"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Company / Organization</label>
              <input name="company" placeholder="e.g. ABC Builders Pvt. Ltd."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea name="notes" rows={3} placeholder="Any additional details…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit"
              className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Save Contact
            </button>
            <Link href="/contacts"
              className="text-sm font-semibold text-gray-500 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
