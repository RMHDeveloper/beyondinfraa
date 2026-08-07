"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Bell, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview",     href: "/dashboard",                        match: "/dashboard" },
  { label: "Matching",     href: "/projects?tab=Matching",            match: "/projects" },
  { label: "Proposals",    href: "/projects?tab=Proposals",           match: null },
  { label: "Negotiations", href: "/projects?tab=Negotiations",        match: null },
];

export default function TopNav() {
  const pathname = usePathname();
  const [tabParam, setTabParam] = useState<string | null>(null);
  useEffect(() => {
    setTabParam(new URLSearchParams(window.location.search).get("tab"));
  }, [pathname]);

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0 z-10">
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
        {TABS.map((tab) => {
          let active = false;
          if (tab.label === "Overview") active = pathname === "/dashboard";
          else if (tab.label === "Matching") active = pathname.startsWith("/projects") && (!tabParam || tabParam === "Matching" || tabParam === "Available Properties");
          else active = pathname.startsWith("/projects") && tabParam === tab.label;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
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
    </header>
  );
}
