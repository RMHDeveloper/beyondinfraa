"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2, Check, AlertCircle, PartyPopper } from "lucide-react";
import { cn, isBlankResponseValue, subcategoryLabel } from "@/lib/utils";
import FieldRenderer from "@/components/project/FieldRenderer";
import { useAutosave } from "@/components/project/useAutosave";
import OtpInput from "@/components/client-portal/OtpInput";
import { getGroupTheme } from "@/components/client-portal/GroupTheme";

type Question = {
  id: string; label: string; fieldType: string; isRequired: boolean;
  isInternal: boolean; options: string[]; unit: string | null; helpText: string | null;
  conditionalJson: { parentLabel: string; matchValue: string } | null;
  autoCalcJson: { formula: string; sourceField: string } | null;
  sortOrder: number;
};
type Group = { id: string; name: string; slug: string; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type CustomField = {
  id: string; label: string; value: string | null; type: "TEXT" | "IMAGE";
  file: { id: string; fileName: string; mimeType: string; originalName: string } | null;
};
type Project = {
  id: string; title: string; state: string;
  category: { name: string }; subcategory: { name: string };
  template: { name: string; groups: TemplateGroup[] };
  responses: { questionId: string; value: string | null; jsonValue: unknown }[];
  customFields: CustomField[];
};

type Phase = "phone" | "otp" | "form";

const NAVY = "#0d2137";

const COUNTRY_CODES = [
  { code: "+91", label: "IN" },
  { code: "+1", label: "US" },
  { code: "+44", label: "UK" },
  { code: "+971", label: "UAE" },
  { code: "+65", label: "SG" },
  { code: "+61", label: "AU" },
];

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [localJsonValues, setLocalJsonValues] = useState<Record<string, unknown>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // Use project autosave but point to client endpoint
  const { status: saveStatus, debouncedSave, immediateSave } = useAutosave(
    project?.id ?? "",
    "/api/client/response"
  );
  const { debouncedSave: debouncedSaveCustomField } = useAutosave(
    project?.id ?? "",
    "/api/client/custom-fields"
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
    const cfVals: Record<string, string> = {};
    for (const cf of data.customFields) cfVals[cf.id] = cf.value ?? "";
    setCustomFieldValues(cfVals);
  }, [token]);

  async function sendOtp() {
    setLoading(true); setError("");
    const res = await fetch("/api/client/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, phone: `${countryCode} ${phone}` }),
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
    if (immediate) {
      const isBlankRepeater = q.fieldType === "REPEATER" && isBlankResponseValue(value, "REPEATER");
      immediateSave(q.id, isBlankRepeater ? null : value, isBlankRepeater ? null : jsonValue);
    } else debouncedSave(q.id, value ?? "");
  }

  function handleCustomFieldChange(cf: CustomField, value: string) {
    setCustomFieldValues((p) => ({ ...p, [cf.id]: value }));
    debouncedSaveCustomField(cf.id, value);
  }

  const readOnly = project?.state !== "OPEN";

  // Visible (non-empty) groups, themed and with completion stats
  const groupSteps = useMemo(() => {
    if (!project) return [];
    return project.template.groups
      .map((tg, i) => {
        const visibleQs = tg.group.questions.filter(isVisible);
        const answered = visibleQs.filter((q) => {
          const v = localValues[q.id];
          return v !== undefined && v !== "";
        }).length;
        return {
          kind: "group" as const,
          tg,
          visibleQs,
          theme: getGroupTheme(tg.group.slug, tg.group.name, i),
          answered,
          total: visibleQs.length,
        };
      })
      .filter((s) => s.total > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, localValues]);

  const customFieldsStep = useMemo(() => {
    if (!project || project.customFields.length === 0) return null;
    const answered = project.customFields.filter((cf) => {
      if (cf.type === "IMAGE") return !!cf.file;
      return (customFieldValues[cf.id] ?? "").trim() !== "";
    }).length;
    return {
      kind: "customFields" as const,
      name: "Additional Details",
      theme: getGroupTheme("additional-fields", "Additional Details", groupSteps.length),
      fields: project.customFields,
      answered,
      total: project.customFields.length,
    };
  }, [project, customFieldValues, groupSteps.length]);

  const steps = useMemo(() => {
    return customFieldsStep ? [...groupSteps, customFieldsStep] : groupSteps;
  }, [groupSteps, customFieldsStep]);

  const totalQuestions = steps.reduce((sum, s) => sum + s.total, 0);
  const totalAnswered = steps.reduce((sum, s) => sum + s.answered, 0);
  const overallPct = totalQuestions === 0 ? 0 : Math.round((totalAnswered / totalQuestions) * 100);
  const firstIncompleteStep = steps.findIndex((s) => s.answered < s.total);

  const clampedStep = Math.min(currentStep, Math.max(steps.length - 1, 0));
  const activeStep = steps[clampedStep];

  if (phase === "phone") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <Image src="/ppt-template/logo-icon.png" alt="Logo" width={48} height={48} className="rounded-lg" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 sm:px-8 py-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-gray-900">Client Portal</h1>
              <p className="text-sm text-gray-400 mt-1">Enter your registered mobile number to continue.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="border border-gray-300 rounded-xl px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0d2137]/20 focus:border-[#0d2137] transition-colors"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} {c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9XXXXXXXXX"
                    inputMode="numeric"
                    maxLength={10}
                    className="flex-1 min-w-0 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2137]/20 focus:border-[#0d2137] transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && phone && sendOtp()}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={sendOtp}
                disabled={!phone || loading}
                style={{ backgroundColor: NAVY }}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send OTP
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "otp") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <Image src="/ppt-template/logo-icon.png" alt="Logo" width={48} height={48} className="rounded-lg" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-6 sm:px-8 py-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-gray-900">Enter OTP</h1>
              <p className="text-sm text-gray-400 mt-1">A 6-digit code was sent to {phone}.</p>
              {devOtp && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mt-2 font-mono inline-block">
                  Dev OTP: {devOtp}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={otp.length !== 6 || loading}
                style={{ backgroundColor: NAVY }}
                className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
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
      </div>
    );
  }

  if (!project || !activeStep) return null;

  const ActiveIcon = activeStep.theme.icon;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div style={{ backgroundColor: NAVY }} className="px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/ppt-template/logo-icon.png" alt="Logo" width={32} height={32} className="rounded-md shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">{project.title}</h1>
              <p className="text-xs text-white/60 truncate">{project.category.name} · {subcategoryLabel(project.subcategory.name)}</p>
            </div>
          </div>
          <span className="text-xs shrink-0">
            {saveStatus === "saving" && <span className="flex items-center gap-1 text-white/70"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
            {saveStatus === "saved" && <span className="flex items-center gap-1 text-emerald-300"><Check className="w-3 h-3" /> Saved</span>}
            {saveStatus === "error" && <span className="flex items-center gap-1 text-red-300"><AlertCircle className="w-3 h-3" /> Error</span>}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {readOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            This form is currently {project.state.toLowerCase()} and cannot be edited.
          </div>
        )}

        {/* Step card */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 tracking-wide">
                STEP {clampedStep + 1} OF {steps.length}
              </span>
              <span className="text-xs font-semibold text-gray-400">{overallPct}% complete</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${overallPct}%`, backgroundColor: NAVY }}
              />
            </div>

            {/* Step bubbles */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {steps.map((s, i) => {
                const active = i === clampedStep;
                const complete = s.answered >= s.total;
                const stepKey = s.kind === "group" ? s.tg.id : "custom-fields";
                const stepName = s.kind === "group" ? s.tg.group.name : s.name;
                return (
                  <button
                    key={stepKey}
                    type="button"
                    onClick={() => setCurrentStep(i)}
                    title={stepName}
                    className={cn(
                      "relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors",
                      active ? "" : "border-gray-200"
                    )}
                    style={active ? { borderColor: s.theme.border, backgroundColor: s.theme.bg } : undefined}
                  >
                    <s.theme.icon
                      className="w-4 h-4"
                      style={{ color: active || complete ? s.theme.dot : "#9ca3af" }}
                    />
                    {complete && (
                      <span
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5 mt-4">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: activeStep.theme.bg }}
              >
                <ActiveIcon className="w-4 h-4" style={{ color: activeStep.theme.dot }} />
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {activeStep.kind === "group" ? activeStep.tg.group.name : activeStep.name}
                </h2>
                <p className="text-xs text-gray-400">{activeStep.answered} of {activeStep.total} answered</p>
              </div>
            </div>
          </div>

          <div className="@container border-t border-gray-100 divide-y divide-gray-50">
            {activeStep.kind === "group" ? activeStep.visibleQs.map((q) => (
              <div key={q.id} className="px-5 py-4">
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
            )) : activeStep.fields.map((cf) => (
              <div key={cf.id} className="px-5 py-4">
                <label className="block text-sm font-medium text-gray-800 mb-2">{cf.label}</label>
                {cf.type === "IMAGE" ? (
                  cf.file ? (
                    <img
                      src={`/api/client/custom-fields/${cf.file.id}`}
                      alt={cf.file.originalName}
                      className="max-w-full max-h-64 rounded-lg border border-gray-200"
                    />
                  ) : (
                    <p className="text-xs text-gray-400 italic">No image provided</p>
                  )
                ) : (
                  <input
                    type="text"
                    value={customFieldValues[cf.id] ?? ""}
                    disabled={readOnly}
                    onChange={(e) => handleCustomFieldChange(cf, e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2137]/20 focus:border-[#0d2137] transition-colors disabled:bg-gray-50 disabled:text-gray-400"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {overallPct === 100 && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
            <PartyPopper className="w-4 h-4 shrink-0" />
            All questions answered. Thank you!
          </div>
        )}

        <div className="pb-4 text-center text-xs text-gray-400">
          Your responses are saved automatically.
        </div>
      </div>

      {/* Footer nav */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={clampedStep === 0}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {clampedStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(steps.length - 1, s + 1))}
              style={{ backgroundColor: NAVY }}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : overallPct === 100 ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">
              <Check className="w-4 h-4" /> All done
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(firstIncompleteStep === -1 ? 0 : firstIncompleteStep)}
              style={{ backgroundColor: NAVY }}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Fill Missing Fields
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
