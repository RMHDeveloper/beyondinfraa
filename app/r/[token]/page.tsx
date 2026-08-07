"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Building2 } from "lucide-react";

type TokenInfo = { id: string; label: string | null; category: { id: string; name: string } };

type Phase = "loading" | "error" | "form" | "done";

export default function BuyerIntakePage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    budgetMin: "", budgetMax: "",
    areaMin: "", areaMax: "",
    bhk: "", furnishing: "", locations: "", notes: "",
  });

  useEffect(() => {
    fetch(`/api/intake/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error)))
      .then(d => { setInfo(d); setPhase("form"); })
      .catch(e => { setErrMsg(e || "Invalid or expired link."); setPhase("error"); });
  }, [token]);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/intake/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setPhase("done");
    } else {
      const d = await res.json();
      setErrMsg(d.error || "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (phase === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
    </div>
  );

  if (phase === "error") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">{errMsg}</p>
        <p className="text-sm text-gray-400 mt-1">Please contact your agent for a new link.</p>
      </div>
    </div>
  );

  if (phase === "done") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">Thank you!</h2>
        <p className="text-sm text-gray-500">
          Your requirements have been submitted. Your agent will be in touch with matching properties shortly.
        </p>
      </div>
    </div>
  );

  const isResidential = info?.category.name === "Residential";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {info?.label ?? "Property Requirement Form"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tell us what you're looking for — {info?.category.name} · {isResidential ? "Purchase" : "Rental"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Contact info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Your Details</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} required
                placeholder="e.g. Ravi Kumar"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                <input value={form.phone} onChange={e => set("phone", e.target.value)} required
                  placeholder="+91 98765 43210" type="tel"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="optional" type="email"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              {isResidential ? "Budget" : "Rent Budget"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isResidential ? "Min Budget (₹)" : "Min Rent (₹/mo)"}
                </label>
                <input value={form.budgetMin} onChange={e => set("budgetMin", e.target.value)}
                  placeholder={isResidential ? "e.g. 5000000" : "e.g. 25000"} type="number"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {isResidential ? "Max Budget (₹)" : "Max Rent (₹/mo)"}
                </label>
                <input value={form.budgetMax} onChange={e => set("budgetMax", e.target.value)}
                  placeholder={isResidential ? "e.g. 10000000" : "e.g. 50000"} type="number"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Property preferences */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Property Preferences</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Min Area (sqft)</label>
                <input value={form.areaMin} onChange={e => set("areaMin", e.target.value)}
                  placeholder="e.g. 800" type="number"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Max Area (sqft)</label>
                <input value={form.areaMax} onChange={e => set("areaMax", e.target.value)}
                  placeholder="e.g. 1500" type="number"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {isResidential && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">BHK</label>
                  <select value={form.bhk} onChange={e => set("bhk", e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Any</option>
                    {["1 BHK","2 BHK","3 BHK","4 BHK","5+ BHK","Studio"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Furnishing</label>
                  <select value={form.furnishing} onChange={e => set("furnishing", e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Any</option>
                    {["Furnished","Semi-Furnished","Unfurnished"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Locations</label>
              <input value={form.locations} onChange={e => set("locations", e.target.value)}
                placeholder="e.g. Bandra, Andheri, Juhu (comma-separated)"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Requirements / Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                rows={3} placeholder="Any specific requirements, timeline, or preferences…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          <button type="submit" disabled={submitting || !form.name.trim() || !form.phone.trim()}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Requirements"}
          </button>

          <p className="text-[10px] text-center text-gray-400">
            Your details are shared only with your agent and used solely for property matching.
          </p>
        </form>
      </div>
    </div>
  );
}
