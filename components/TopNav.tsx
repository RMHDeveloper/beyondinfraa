"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Settings, Plus, Menu, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview",  href: "/dashboard",             match: "/dashboard" },
  { label: "Matching",  href: "/projects?tab=Matching", match: "/projects" },
  { label: "Proposals", href: "/projects?tab=Proposals", match: null },
];

type SearchResults = {
  projects: { id: string; title: string; projectNumber: string; category: { name: string }; subcategory: { name: string } }[];
  contacts: { id: string; name: string; phone: string | null; email: string | null; type: string }[];
};

export default function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabParam = useSearchParams().get("tab");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return; }
    const handle = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then(r => r.json())
        .then(setResults)
        .catch(() => setResults(null));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  const hasResults = !!results && (results.projects.length > 0 || results.contacts.length > 0);

  function tabActive(tab: typeof TABS[number]) {
    if (tab.label === "Overview") return pathname === "/dashboard";
    if (tab.label === "Matching") return pathname.startsWith("/projects") && (!tabParam || tabParam === "Matching" || tabParam === "Inventory");
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
        {/* Left tabs */}
        <nav className="flex items-center gap-0 flex-1 justify-start">
          {TABS.slice(0, 2).map((tab) => (
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

        {/* Center: search + create */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative w-64" ref={searchBoxRef}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || !results) return;
                if (results.projects.length > 0) goTo(`/projects/${results.projects[0].id}`);
                else if (results.contacts.length > 0) goTo(`/contacts/${results.contacts[0].id}`);
              }}
              placeholder="Search projects or contacts…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-colors"
            />
            {open && query.trim().length >= 2 && (
              <div className="absolute top-full left-0 mt-1 w-96 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                {!results && (
                  <p className="text-xs text-gray-400 px-3 py-3">Searching…</p>
                )}
                {results && !hasResults && (
                  <p className="text-xs text-gray-400 px-3 py-3">No results for "{query.trim()}"</p>
                )}
                {results && results.projects.length > 0 && (
                  <div className="py-1.5">
                    <p className="px-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Projects</p>
                    {results.projects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => goTo(`/projects/${p.projectNumber}`)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-800 truncate">{p.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{p.projectNumber} · {p.category.name} / {p.subcategory.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {results && results.contacts.length > 0 && (
                  <div className="py-1.5 border-t border-gray-100">
                    <p className="px-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Contacts</p>
                    {results.contacts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => goTo(`/contacts/${c.id}`)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{c.phone ?? c.email ?? c.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            New Entry
          </Link>
        </div>

        {/* Right tabs + actions */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <nav className="flex items-center gap-0">
            {TABS.slice(2).map((tab) => (
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
          <button className="relative p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors">
            <Bell className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors">
            <Settings className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
