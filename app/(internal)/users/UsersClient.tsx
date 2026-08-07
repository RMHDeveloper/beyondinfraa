"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, User, UserCheck, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string; name: string; email: string; phone: string;
  role: string; isActive: boolean; createdAt: Date | string;
};

const ROLE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: "Super Admin", color: "#dc2626", bg: "#fef2f2" },
  OWNER:       { label: "Owner",       color: "#7c3aed", bg: "#f5f3ff" },
  EMPLOYEE:    { label: "Employee",    color: "#2563eb", bg: "#eff6ff" },
};

export default function UsersClient({ users }: { users: UserRow[] }) {
  const [roleFilter, setRoleFilter] = useState("All");

  const filtered = roleFilter === "All" ? users : users.filter((u) => u.role === roleFilter);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP System › Users & Roles</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Users & Roles</h1>
        </div>
        <Link href="/users/new" className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add User
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
        {/* Role summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          {Object.entries(ROLE_STYLES).map(([role, { label, color, bg }]) => {
            const count = users.filter((u) => u.role === role).length;
            const Icon = role === "SUPER_ADMIN" ? Shield : role === "OWNER" ? UserCheck : User;
            return (
              <button key={role} onClick={() => setRoleFilter(roleFilter === role ? "All" : role)}
                className={cn("bg-white rounded-xl border p-4 text-left transition-colors hover:border-gray-300",
                  roleFilter === role ? "border-2" : "border-gray-200")}
                style={roleFilter === role ? { borderColor: color } : undefined}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                </div>
                <p className="text-3xl font-bold" style={{ color }}>{count}</p>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => {
                const rs = ROLE_STYLES[u.role] ?? ROLE_STYLES.EMPLOYEE;
                const initials = u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white bg-[#1a2b3c]">
                          {initials}
                        </div>
                        <span className="font-semibold text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: rs.bg, color: rs.color }}>
                        {rs.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                        u.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.isActive ? "bg-green-500" : "bg-gray-400")} />
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
