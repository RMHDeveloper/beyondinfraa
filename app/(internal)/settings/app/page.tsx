"use client";

import { useEffect, useState } from "react";
import { Check, FlaskConical, Loader2 } from "lucide-react";

type Settings = Record<string, string>;

const FIELDS = [
  { key: "smtp_host",          label: "SMTP Host",           placeholder: "smtp.gmail.com" },
  { key: "smtp_port",          label: "SMTP Port",           placeholder: "587" },
  { key: "smtp_user",          label: "SMTP User (email)",   placeholder: "you@gmail.com" },
  { key: "smtp_pass",          label: "SMTP Password",       placeholder: "••••••••", type: "password" },
  { key: "smtp_from",          label: "From Address",        placeholder: "BeyondInfra <noreply@beyondinfra.com>" },
  { key: "otp_expiry_minutes", label: "OTP Expiry (minutes)", placeholder: "5" },
  { key: "employees_enabled",  label: "Enable Employees",    placeholder: "true / false" },
];

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ ok: boolean; message: string; projectId?: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/app").then((r) => r.json()).then(setSettings);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/settings/app", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function runDemoSeed() {
    setSeeding(true);
    setSeedResult(null);
    const res = await fetch("/api/dev/seed-demo", { method: "POST" });
    const data = await res.json();
    setSeedResult(data);
    setSeeding(false);
  }

  return (
    <div className="max-w-lg">
      <form onSubmit={handleSave} className="space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
            <input
              type={f.type ?? "text"}
              value={settings[f.key] ?? ""}
              onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        ))}

        <div className="pt-2 flex items-center gap-3">
          <button type="submit" className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors">
            Save Settings
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </form>

      {/* Demo Data */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Developer Tools</p>
        <p className="text-sm text-gray-500 mb-4">
          Create a demo Land Sale project with responses, owner units, negotiations, meetings, and audit trail pre-filled. Also seeds scoring rules if not present.
        </p>
        <button
          onClick={runDemoSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
          {seeding ? "Creating demo data…" : "Create Demo Project + Scoring Rules"}
        </button>
        {seedResult && (
          <div className={`mt-3 px-4 py-3 rounded-lg text-sm border ${seedResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"}`}>
            {seedResult.message}
            {seedResult.projectId && (
              <a href={`/projects/${seedResult.projectId}`} className="ml-2 font-bold underline">
                Open Project →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
