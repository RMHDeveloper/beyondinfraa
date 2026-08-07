"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Home, Briefcase, Factory, RefreshCw,
  Users, BarChart2, Settings, ClipboardList, LogOut,
  ChevronRight, MapPin, Building2, Link2, UserCog, FileText,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { useState, useEffect } from "react";

type Props = { user: SessionUser };

const sectorNav = [
  { href: "/dashboard",              label: "Dashboard",    icon: LayoutDashboard },
  { href: "/projects?cat=Residential",   label: "Residential",  icon: Home,       color: "#2563eb" },
  { href: "/projects?cat=Commercial",    label: "Commercial",   icon: Briefcase,  color: "#d97706" },
  { href: "/projects?cat=Industrial",    label: "Industrial",   icon: Factory,    color: "#7c3aed" },
  { href: "/projects?cat=Redevelopment", label: "Redevelopment",icon: RefreshCw,  color: "#0d9488" },
];

const mgmtNav = [
  { href: "/contacts",              label: "Contacts",          icon: Users,         roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/requirements/buyer",    label: "Buyer Reqs",        icon: Users,         roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/requirements/tenant",   label: "Tenant Reqs",       icon: Building2,     roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/proposals",             label: "Proposals",         icon: FileText,      roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/intake",                label: "Intake Links",      icon: Link2,         roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/tasks",                 label: "Tasks & Follow-ups", icon: ClipboardList, roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/site-visits",           label: "Site Visits",       icon: MapPin,        roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/reports",               label: "Reports",           icon: BarChart2,     roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/employees",             label: "Employees",         icon: UserCog,       roles: ["SUPER_ADMIN", "OWNER"] as const },
  { href: "/audit-logs",            label: "Audit Logs",        icon: FileText,      roles: ["SUPER_ADMIN"] as const },
  { href: "/users",                 label: "Users & Roles",     icon: Users,         roles: ["SUPER_ADMIN"] as const },
  { href: "/settings",              label: "Settings",          icon: Settings,      roles: ["SUPER_ADMIN", "OWNER"] as const },
];

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed(v => {
      localStorage.setItem("sidebar_collapsed", v ? "0" : "1");
      return !v;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function isActive(href: string) {
    const base = href.split("?")[0];
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === base || pathname.startsWith(base + "/");
  }

  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className={cn(
      "flex flex-col min-h-screen flex-shrink-0 bg-white border-r border-gray-200 transition-all duration-200",
      collapsed ? "w-[52px]" : "w-[220px]"
    )}>
      {/* Logo + toggle */}
      <div className={cn("border-b border-gray-100 flex items-center", collapsed ? "px-2 py-4 justify-center" : "px-3 py-4 gap-2")}>
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#1a2b3c] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">BI</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">BeyondInfra</p>
              <p className="text-[10px] text-gray-400 leading-tight">Consultancy ERP</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-md bg-[#1a2b3c] flex items-center justify-center">
            <span className="text-white text-xs font-bold">BI</span>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0",
            collapsed ? "mt-2 ml-0" : ""
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" strokeWidth={1.75} />
            : <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {/* Main sectors */}
        <div className={cn("space-y-0.5", collapsed ? "px-1.5" : "px-3")}>
          {sectorNav.map((item) => {
            const active = isActive(item.href);
            const color = (item as { color?: string }).color ?? "#374151";
            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                style={active ? { color } : undefined}
              >
                <item.icon
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={1.75}
                  style={{ color: active ? color : undefined }}
                />
                {!collapsed && (
                  <>
                    {item.label}
                    {active && item.label !== "Dashboard" && (
                      <ChevronRight className="w-3 h-3 ml-auto" style={{ color }} />
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>

        {/* Management group */}
        <div className={cn("mt-4", collapsed ? "px-1.5" : "px-3")}>
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Management</p>
          )}
          {collapsed && <div className="border-t border-gray-100 mb-2" />}
          <div className="space-y-0.5">
            {mgmtNav.map((item) => {
              if (item.roles && !([...item.roles] as string[]).includes(user.role)) return null;
              const active = isActive(item.href) && item.href !== "/settings";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-lg text-sm font-medium transition-colors",
                    collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2",
                    active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
                  {!collapsed && item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5 px-2 py-2")}>
          <div
            className="w-8 h-8 rounded-full bg-[#1a2b3c] flex items-center justify-center flex-shrink-0"
            title={collapsed ? `${user.name} — ${user.role.replace(/_/g, " ").toLowerCase()}` : undefined}
          >
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 truncate capitalize">{user.role.replace(/_/g, " ").toLowerCase()}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0" title="Sign out">
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </>
          )}
          {collapsed && (
            <button onClick={handleLogout} className="mt-2 text-gray-400 hover:text-gray-700 transition-colors" title="Sign out">
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
