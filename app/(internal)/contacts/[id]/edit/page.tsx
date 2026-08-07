import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ArrowLeft, User } from "lucide-react";

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

export const dynamic = "force-dynamic";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await db.contact.findUnique({ where: { id } });
  if (!contact) notFound();

  async function updateContact(formData: FormData) {
    "use server";
    const name     = (formData.get("name") as string).trim();
    const type     = formData.get("type") as string;
    const phone    = (formData.get("phone") as string).trim() || null;
    const email    = (formData.get("email") as string).trim() || null;
    const company  = (formData.get("company") as string).trim() || null;
    const notes    = (formData.get("notes") as string).trim() || null;
    const isActive = formData.get("isActive") === "true";
    if (!name) return;
    await db.contact.update({ where: { id }, data: { name, type: type as any, phone, email, company, notes, isActive } });
    redirect(`/contacts/${id}`);
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href={`/contacts/${id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">ERP › Contacts › {contact.name} › Edit</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Edit Contact</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <form action={updateContact} className="max-w-xl space-y-4">
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
              <select name="type" defaultValue={contact.type}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                {CONTACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-3">
            <button type="submit"
              className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
            <Link href={`/contacts/${id}`}
              className="text-sm font-semibold text-gray-500 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
