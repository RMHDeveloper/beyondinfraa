"use client";

import { useEffect, useState } from "react";
import { Link2, Plus, Copy, Check, Loader2, ExternalLink, Users } from "lucide-react";

type Category = { id: string; name: string };
type Token = {
  id: string; token: string; label: string | null; isActive: boolean;
  expiresAt: string | null; createdAt: string;
  category: { name: string };
  _count: { submissions: number };
};

type Tab = "buyer" | "tenant";

function TokenList({
  tokens, urlPrefix, copiedId, onCopy,
}: {
  tokens: Token[];
  urlPrefix: string;
  copiedId: string | null;
  onCopy: (t: Token) => void;
}) {
  if (tokens.length === 0) return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <Link2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-sm text-gray-500 font-medium">No intake links yet</p>
      <p className="text-xs text-gray-400 mt-1">Create a link and share it with clients to collect requirements.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {tokens.map(t => (
        <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-sm truncate min-w-0">{t.label ?? "Intake Form"}</span>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{t.category.name}</span>
                {!t.isActive && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inactive</span>}
                {t.expiresAt && new Date(t.expiresAt) < new Date() && (
                  <span className="text-[10px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Expired</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t._count.submissions} submissions
                </span>
                {t.expiresAt && (
                  <span className="text-[10px] text-gray-400">
                    Expires {new Date(t.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
                <span className="text-[10px] font-mono text-gray-500 truncate flex-1 min-w-0">{urlPrefix}/{t.token}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={`${urlPrefix}/${t.token}`} target="_blank" rel="noreferrer"
                className="text-[10px] font-bold border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Preview
              </a>
              <button onClick={() => onCopy(t)}
                className="text-[10px] font-bold bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1">
                {copiedId === t.id ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IntakePage() {
  const [tab, setTab] = useState<Tab>("buyer");
  const [buyerTokens, setBuyerTokens] = useState<Token[]>([]);
  const [tenantTokens, setTenantTokens] = useState<Token[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categoryId: "", label: "", expiresAt: "" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const [b, t, c] = await Promise.all([
      fetch("/api/intake").then(r => r.json()),
      fetch("/api/intake/tenant").then(r => r.json()),
      fetch("/api/settings/categories").then(r => r.json()),
    ]);
    setBuyerTokens(b);
    setTenantTokens(t);
    setCategories(c);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.categoryId) return;
    setCreating(true);
    const endpoint = tab === "buyer" ? "/api/intake" : "/api/intake/tenant";
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: form.categoryId, label: form.label || null, expiresAt: form.expiresAt || null }),
    });
    setShowForm(false);
    setForm({ categoryId: "", label: "", expiresAt: "" });
    await load();
    setCreating(false);
  }

  function copyLink(t: Token) {
    const prefix = tab === "buyer" ? "/r" : "/r/t";
    navigator.clipboard.writeText(`${window.location.origin}${prefix}/${t.token}`);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const tokens = tab === "buyer" ? buyerTokens : tenantTokens;
  const urlPrefix = tab === "buyer" ? "/r" : "/r/t";

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP › Intake Links</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" /> Intake Links
          </h1>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> New Link
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(["buyer", "tenant"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "buyer" ? `Buyer (${buyerTokens.length})` : `Tenant (${tenantTokens.length})`}
            </button>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
          <strong>How it works:</strong> Create a link → share with {tab}s → they fill their requirements → a contact + {tab} requirement is auto-created in the system.
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Create New {tab === "buyer" ? "Buyer" : "Tenant"} Intake Link
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
              <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Label (optional)</label>
              <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder={`e.g. ${tab === "buyer" ? "Residential Buyers" : "Commercial Tenants"} — Aug 2025`}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Expires On (optional)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={create} disabled={!form.categoryId || creating}
                className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {creating ? "Creating…" : "Create Link"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="border border-gray-200 text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : (
          <TokenList tokens={tokens} urlPrefix={urlPrefix} copiedId={copiedId} onCopy={copyLink} />
        )}
      </div>
    </div>
  );
}
