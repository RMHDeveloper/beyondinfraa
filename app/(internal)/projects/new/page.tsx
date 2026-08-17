"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Sub = { id: string; name: string; slug: string; templates?: Template[] };
type Category = { id: string; name: string; slug: string; subcategories: Sub[] };
type Template = { id: string; name: string; version: number };
type Contact = { id: string; name: string; type: string; phone: string | null };

type Step = "category" | "subcategory" | "details";

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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isNewReferrer = form.referredById === "__new__";

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
          clientPhone: form.clientPhone || null,
          clientEmail: form.clientEmail || null,
          leadSource: form.leadSource || null,
          leadDate: form.leadDate || null,
          referredById: form.referredById && form.referredById !== "__new__" ? form.referredById : null,
          newReferrerName: isNewReferrer ? form.newReferrerName || null : null,
          newReferrerPhone: isNewReferrer ? form.newReferrerPhone || null : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create project");
        return;
      }
      const project = await res.json();
      router.push(`/projects/${project.id}`);
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Client (optional — can add later)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    value={form.clientName}
                    onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                    placeholder="Primary contact name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    value={form.clientPhone}
                    onChange={(e) => setForm((p) => ({ ...p, clientPhone: e.target.value }))}
                    placeholder="9XXXXXXXXX"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                    value={form.clientEmail}
                    onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))}
                    placeholder="client@email.com"
                  />
                </div>
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
                disabled={saving || !form.title.trim() || !selectedTemplate}
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
