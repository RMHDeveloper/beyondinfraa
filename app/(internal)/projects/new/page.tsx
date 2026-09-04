"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Sub = { id: string; name: string; slug: string; templates?: Template[] };
type Category = { id: string; name: string; slug: string; subcategories: Sub[] };
type Template = { id: string; name: string; version: number };
type Contact = { id: string; name: string; type: string; phone: string | null; email: string | null };

type Step = "category" | "subcategory" | "details";

const COUNTRY_CODES = [
  { code: "+91", label: "IN" },
  { code: "+1", label: "US" },
  { code: "+44", label: "UK" },
  { code: "+971", label: "UAE" },
  { code: "+65", label: "SG" },
  { code: "+61", label: "AU" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("category");
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedSub, setSelectedSub] = useState<Sub | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [form, setForm] = useState({
    title: "", clientName: "", clientPhone: "", clientEmail: "", leadSource: "", leadDate: "",
    referredById: "", newReferrerName: "", newReferrerPhone: "",
    clientContactId: "",
  });
  const [clientQuery, setClientQuery] = useState("");
  const [clientCountryCode, setClientCountryCode] = useState("+91");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientBoxRef = useRef<HTMLDivElement>(null);
  const [clientImage, setClientImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isNewReferrer = form.referredById === "__new__";
  const isDemandSub = selectedSub?.name === "Buy" || selectedSub?.name === "Tenant";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (clientBoxRef.current && !clientBoxRef.current.contains(e.target as Node)) setClientDropdownOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const clientMatches = clientQuery.trim().length > 0
    ? contacts.filter((c) =>
        c.name.toLowerCase().includes(clientQuery.trim().toLowerCase()) ||
        (c.phone ?? "").includes(clientQuery.trim())
      ).slice(0, 8)
    : [];

  function pickExistingClient(c: Contact) {
    const raw = (c.phone ?? "").trim();
    const codeMatch = raw.match(/^(\+\d{1,3})[\s-]?(.*)$/);
    const digits = (codeMatch ? codeMatch[2] : raw).replace(/\D/g, "").slice(-10);
    setForm((p) => ({ ...p, clientContactId: c.id, clientName: c.name, clientPhone: digits, clientEmail: c.email ?? "" }));
    setClientCountryCode(codeMatch ? codeMatch[1] : "+91");
    setClientQuery(c.name);
    setClientDropdownOpen(false);
  }

  function setNewClientName(name: string) {
    setForm((p) => ({ ...p, clientContactId: "", clientName: name }));
    setClientQuery(name);
    setClientDropdownOpen(true);
  }

  useEffect(() => {
    fetch("/api/settings/categories").then((r) => r.json()).then(setCategories);
    fetch("/api/contacts").then((r) => r.json()).then(setContacts);
  }, []);

  useEffect(() => {
    if (!selectedSub) return;
    fetch("/api/settings/templates")
      .then((r) => r.json())
      .then((all: Array<{ id: string; name: string; version: number; subcategory: { id: string } }>) => {
        setTemplates(all.filter((t) => t.subcategory.id === selectedSub.id));
      });
  }, [selectedSub]);

  useEffect(() => {
    if (templates.length === 1) setSelectedTemplate(templates[0]);
  }, [templates]);

  async function handleCreate() {
    if (!selectedCat || !selectedSub || !selectedTemplate || !form.title.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.clientName.trim() || !form.clientPhone.trim()) {
      setError("Client Name and Phone are required.");
      return;
    }
    if (form.clientPhone.trim().length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCat.id,
          subcategoryId: selectedSub.id,
          templateId: selectedTemplate.id,
          templateVersion: selectedTemplate.version,
          title: form.title.trim(),
          clientName: form.clientName || null,
          clientPhone: form.clientPhone.trim() ? `${clientCountryCode} ${form.clientPhone.trim()}` : null,
          clientEmail: form.clientEmail || null,
          leadSource: form.leadSource || null,
          leadDate: form.leadDate || null,
          referredById: form.referredById && form.referredById !== "__new__" ? form.referredById : null,
          newReferrerName: isNewReferrer ? form.newReferrerName || null : null,
          newReferrerPhone: isNewReferrer ? form.newReferrerPhone || null : null,
          clientContactId: form.clientContactId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create project");
        return;
      }
      const project = await res.json();

      if (clientImage) {
        const fd = new FormData();
        fd.append("file", clientImage);
        fd.append("kind", "GALLERY_IMAGE");
        await fetch(`/api/projects/${project.id}/files`, { method: "POST", body: fd }).catch(() => {});
      }

      // Bust the router cache so navigating back to the properties list (or its
      // category views) doesn't show a stale snapshot from before this project existed.
      router.refresh();
      router.push(`/projects/${project.projectNumber}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <span className={cn(step === "category" ? "text-gray-900 font-medium" : "")}>Category</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className={cn(step === "subcategory" ? "text-gray-900 font-medium" : selectedCat ? "" : "opacity-40")}>Type</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className={cn(step === "details" ? "text-gray-900 font-medium" : selectedSub ? "" : "opacity-40")}>Details</span>
      </div>

      {/* Step 1 — Category */}
      {step === "category" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Select Category</h1>
          <p className="text-sm text-gray-400 mb-6">What kind of property is this project for?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.filter((cat) => cat.name !== "Land").map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCat(cat); setSelectedSub(null); setSelectedTemplate(null); setStep("subcategory"); }}
                className="text-left px-5 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-900 hover:shadow-sm transition-all group"
              >
                <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                <p className="text-xs text-gray-400 mt-1">{cat.subcategories.map((s) => s.name).join(" · ")}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Subcategory */}
      {step === "subcategory" && selectedCat && (
        <div>
          <button onClick={() => setStep("category")} className="text-sm text-gray-400 hover:text-gray-700 mb-4 flex items-center gap-1">
            ← {selectedCat.name}
          </button>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Select Type</h1>
          <p className="text-sm text-gray-400 mb-6">Choose the transaction type for this {selectedCat.name} project.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {selectedCat.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => { setSelectedSub(sub); setSelectedTemplate(null); setStep("details"); }}
                className="text-left px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-900 transition-all"
              >
                <p className="font-semibold text-gray-900 text-sm">{sub.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Details */}
      {step === "details" && selectedCat && selectedSub && (
        <div>
          <button onClick={() => setStep("subcategory")} className="text-sm text-gray-400 hover:text-gray-700 mb-4 flex items-center gap-1">
            ← {selectedCat.name} / {selectedSub.name}
          </button>
          <h1 className="text-xl font-bold text-gray-900 mb-6">Project Details</h1>

          {templates.length > 1 && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
              <div className="flex gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                      selectedTemplate?.id === t.id
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-400")}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder={`e.g. ${selectedCat.name} ${selectedSub.name} — Anna Nagar`}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Client</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative" ref={clientBoxRef}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    value={clientQuery}
                    onChange={(e) => setNewClientName(e.target.value)}
                    onFocus={() => setClientDropdownOpen(true)}
                    placeholder="Type to search or add a client…"
                    autoComplete="off"
                  />
                  {clientDropdownOpen && clientQuery.trim().length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                      <button
                        type="button"
                        onClick={() => { setForm((p) => ({ ...p, clientContactId: "" })); setClientDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors border-b border-gray-100"
                      >
                        + Add "{clientQuery.trim()}"
                      </button>
                      {clientMatches.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickExistingClient(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-gray-900">{c.name}</span>
                          <span className="text-xs text-gray-400 ml-1.5">{c.phone ?? c.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                      value={clientCountryCode}
                      onChange={(e) => setClientCountryCode(e.target.value)}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.code} {c.label}</option>
                      ))}
                    </select>
                    <input
                      className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                      value={form.clientPhone}
                      onChange={(e) => setForm((p) => ({ ...p, clientPhone: e.target.value.replace(/\D/g, "").slice(0, 10), clientContactId: "" }))}
                      placeholder="9XXXXXXXXX"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    value={form.clientEmail}
                    onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value, clientContactId: "" }))}
                    placeholder="client@email.com"
                  />
                </div>
                {isDemandSub && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Photo (optional)</label>
                    {clientImage ? (
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2">
                        <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate flex-1">{clientImage.name}</span>
                        <button type="button" onClick={() => setClientImage(null)} className="text-gray-400 hover:text-gray-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 hover:border-gray-400 cursor-pointer transition-colors">
                        <ImageIcon className="w-4 h-4" />
                        Upload a photo of the client
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => setClientImage(e.target.files?.[0] ?? null)} />
                      </label>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Lead Info (optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Source</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                    value={form.leadSource}
                    onChange={(e) => setForm((p) => ({ ...p, leadSource: e.target.value }))}
                  >
                    <option value="">Select source…</option>
                    {["Walk-in","Referral","BNI","Social Media","Google","Cold Call","Site Hoarding","WhatsApp","Email Campaign","Other"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    value={form.leadDate}
                    onChange={(e) => setForm((p) => ({ ...p, leadDate: e.target.value }))}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
                <div className={cn(isNewReferrer && "sm:col-span-2")}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Referred By <span className="text-gray-400 font-normal">(so referral payouts can be tracked)</span>
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                    value={form.referredById}
                    onChange={(e) => setForm((p) => ({ ...p, referredById: e.target.value }))}
                  >
                    <option value="">No one / not applicable</option>
                    <option value="__new__">+ Add New Person</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                  {isNewReferrer && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <input placeholder="Full Name *"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        value={form.newReferrerName}
                        onChange={(e) => setForm((p) => ({ ...p, newReferrerName: e.target.value }))} />
                      <input placeholder="Phone"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        value={form.newReferrerPhone}
                        onChange={(e) => setForm((p) => ({ ...p, newReferrerPhone: e.target.value }))} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="pt-2">
              <button
                onClick={handleCreate}
                disabled={saving || !form.title.trim() || !selectedTemplate || !form.clientName.trim() || !form.clientPhone.trim()}
                className="w-full py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Creating…" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
