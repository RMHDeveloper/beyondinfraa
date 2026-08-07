"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const ROLES = [
  { value: "EMPLOYEE",    label: "Employee" },
  { value: "OWNER",       label: "Owner" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

export default function NewUserPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "EMPLOYEE", password: "" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create user");
        return;
      }
      router.push("/users");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/users" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">Users & Roles › Add User</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Add New User</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="max-w-lg bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rahul Sharma" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="rahul@company.com" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+91 98765 43210" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
            <select value={form.role} onChange={(e) => set("role", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">Employee = standard access · Owner = manage contacts + reports · Super Admin = full access</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
            <input required type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 8 characters" minLength={8} />
            <p className="text-[10px] text-gray-400 mt-1">User can change this after first login from Settings.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="bg-blue-600 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Creating…" : "Create User"}
            </button>
            <Link href="/users" className="text-xs text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
