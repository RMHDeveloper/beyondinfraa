"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import FieldRenderer from "@/components/project/FieldRenderer";
import { useAutosave } from "@/components/project/useAutosave";

type Question = {
  id: string; label: string; fieldType: string; isRequired: boolean;
  isInternal: boolean; options: string[]; unit: string | null; helpText: string | null;
  conditionalJson: { parentLabel: string; matchValue: string } | null;
  autoCalcJson: { formula: string; sourceField: string } | null;
  sortOrder: number;
};
type Group = { id: string; name: string; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type Project = {
  id: string; title: string; state: string;
  category: { name: string }; subcategory: { name: string };
  template: { name: string; groups: TemplateGroup[] };
  responses: { questionId: string; value: string | null; jsonValue: unknown }[];
};

type Phase = "phone" | "otp" | "form";

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [localJsonValues, setLocalJsonValues] = useState<Record<string, unknown>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Use project autosave but point to client endpoint
  const { status: saveStatus, debouncedSave, immediateSave } = useAutosave(
    project?.id ?? "",
    "/api/client/response"
  );

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/client/project?token=${token}`);
    if (!res.ok) return;
    const data: Project = await res.json();
    setProject(data);
    const vals: Record<string, string> = {};
    const jsonVals: Record<string, unknown> = {};
    for (const r of data.responses) {
      vals[r.questionId] = r.value ?? "";
      if (r.jsonValue !== null) jsonVals[r.questionId] = r.jsonValue;
    }
    setLocalValues(vals);
    setLocalJsonValues(jsonVals);
    const exp: Record<string, boolean> = {};
    for (const tg of data.template.groups) exp[tg.id] = true;
    setExpandedGroups(exp);
  }, [token]);

  async function sendOtp() {
    setLoading(true); setError("");
    const res = await fetch("/api/client/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to send OTP"); return; }
    if (data.otp) setDevOtp(data.otp); // dev only
    setPhase("otp");
  }

  async function verifyOtp() {
    setLoading(true); setError("");
    const res = await fetch("/api/client/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Invalid OTP"); return; }
    await loadProject();
    setPhase("form");
  }

  // Build label->value map for conditional logic
  const labelValueMap: Record<string, string> = {};
  if (project) {
    for (const tg of project.template.groups) {
      for (const q of tg.group.questions) {
        if (!q.isInternal) labelValueMap[q.label] = localValues[q.id] ?? "";
      }
    }
  }

  function isVisible(q: Question): boolean {
    if (q.isInternal) return false;
    if (!q.conditionalJson) return true;
    return labelValueMap[q.conditionalJson.parentLabel] === q.conditionalJson.matchValue;
  }

  function handleChange(q: Question, value: string | null, jsonValue?: unknown, immediate = false) {
    setLocalValues((p) => ({ ...p, [q.id]: value ?? "" }));
    if (jsonValue !== undefined) setLocalJsonValues((p) => ({ ...p, [q.id]: jsonValue }));
    if (immediate) immediateSave(q.id, value, jsonValue);
    else debouncedSave(q.id, value ?? "");
  }

  const readOnly = project?.state !== "OPEN";

  if (phase === "phone") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 sm:px-8 py-8 w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">Client Portal</h1>
            <p className="text-sm text-gray-400 mt-1">Enter your registered mobile number to continue.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9XXXXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                onKeyDown={(e) => e.key === "Enter" && phone && sendOtp()}
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={sendOtp}
              disabled={!phone || loading}
              className="w-full py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send OTP
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "otp") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 sm:px-8 py-8 w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">Enter OTP</h1>
            <p className="text-sm text-gray-400 mt-1">A 6-digit code was sent to {phone}.</p>
            {devOtp && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-2 font-mono">
                Dev OTP: {devOtp}
              </p>
            )}
          </div>
          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full border border-gray-300 rounded-lg px-3.5 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-gray-900"
              onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && verifyOtp()}
            />
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={verifyOtp}
              disabled={otp.length !== 6 || loading}
              className="w-full py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify &amp; Continue
            </button>
            <button onClick={() => { setPhase("phone"); setError(""); setOtp(""); }}
              className="w-full text-sm text-gray-400 hover:text-gray-700 py-1">
              ← Change number
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900">{project.title}</h1>
            <p className="text-xs text-gray-400">{project.category.name} · {project.subcategory.name}</p>
          </div>
          <span className="text-xs shrink-0">
            {saveStatus === "saving" && <span className="flex items-center gap-1 text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
            {saveStatus === "saved" && <span className="flex items-center gap-1 text-green-600"><Check className="w-3 h-3" /> Saved</span>}
            {saveStatus === "error" && <span className="flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" /> Error</span>}
          </span>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {readOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            This form is currently {project.state.toLowerCase()} and cannot be edited.
          </div>
        )}

        {project.template.groups.map((tg) => {
          const visibleQs = tg.group.questions.filter(isVisible);
          if (visibleQs.length === 0) return null;
          const isOpen = expandedGroups[tg.id] !== false;

          return (
            <div key={tg.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedGroups((p) => ({ ...p, [tg.id]: !p[tg.id] }))}
                className="flex items-center gap-2.5 w-full px-4 py-3.5 text-left"
              >
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-sm text-gray-900">{tg.group.name}</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {visibleQs.map((q) => (
                    <div key={q.id} className="px-4 py-4">
                      <label className="block text-sm font-medium text-gray-800 mb-2">
                        {q.label}
                        {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {q.helpText && (
                        <p className="text-xs text-gray-400 mb-2">{q.helpText}</p>
                      )}
                      <FieldRenderer
                        question={q}
                        value={localValues[q.id] ?? ""}
                        jsonValue={localJsonValues[q.id]}
                        disabled={readOnly}
                        allValues={labelValueMap}
                        onChange={(val, json) => {
                          const immediate = ["RADIO", "DROPDOWN", "MULTISELECT", "REPEATER", "DATE"].includes(q.fieldType);
                          handleChange(q, val, json, immediate);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="pb-8 text-center text-xs text-gray-400">
          Your responses are saved automatically.
        </div>
      </div>
    </div>
  );
}
