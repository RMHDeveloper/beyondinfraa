"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Settings, Plus, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview",     href: "/dashboard",                        match: "/dashboard" },
  { label: "Matching",     href: "/projects?tab=Matching",            match: "/projects" },
  { label: "Proposals",    href: "/projects?tab=Proposals",           match: null },
  { label: "Negotiations", href: "/projects?tab=Negotiations",        match: null },
];

export default function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const tabParam = useSearchParams().get("tab");

  function tabActive(tab: typeof TABS[number]) {
    if (tab.label === "Overview") return pathname === "/dashboard";
    if (tab.label === "Matching") return pathname.startsWith("/projects") && (!tabParam || tabParam === "Matching" || tabParam === "Available Properties");
    return pathname.startsWith("/projects") && tabParam === tab.label;
  }

  return (
    <header className="bg-white border-b border-gray-200 flex-shrink-0 sticky top-0 z-20">
      {/* Mobile: app bar (menu + logo + new) then tabs row below */}
      <div className="flex md:hidden items-center h-12 px-3 gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
          title="Open menu"
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
        </button>
        <div className="flex items-center gap-1.5 min-w-0 ml-auto">
          <div className="w-6 h-6 rounded-md bg-[#1a2b3c] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">BI</span>
          </div>
          <span className="text-sm font-bold text-gray-900 truncate">BeyondInfra</span>
        </div>
      </div>
      <div className="flex md:hidden items-center gap-1 pl-1 pr-3 border-t border-gray-100">
        <nav className="flex items-center gap-0 flex-1 min-w-0 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0",
                tabActive(tab)
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/projects/new"
          className="flex items-center justify-center bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 transition-colors flex-shrink-0"
          title="New Entry"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Desktop: single row */}
      <div className="hidden md:flex items-center h-12 px-6 gap-4 min-w-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            placeholder="Search properties, leads, or tasks…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-0 flex-1 justify-center">
          {TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tabActive(tab)
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="relative p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors">
            <Bell className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors">
            <Settings className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            New Entry
          </Link>
        </div>
      </div>
    </header>
  );
}
