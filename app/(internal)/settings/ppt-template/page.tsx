"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Loader2, Check } from "lucide-react";

const SLOTS = [
  { key: "cover", label: "Welcome / Cover Slide", help: "The fixed first slide of every marketing PPT." },
  { key: "logo", label: "Property Slide Branding", help: "Logo shown on every property photo slide." },
  { key: "thankyou", label: "Thank You Slide", help: "The fixed last slide of every marketing PPT." },
] as const;

export default function PptTemplateSettingsPage() {
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/settings/ppt-template").then((r) => r.json()).then(setConfigured);
  }, [version]);

  async function handleUpload(slot: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(slot);
    const fd = new FormData();
    fd.append("slot", slot);
    fd.append("file", file);
    await fetch("/api/settings/ppt-template", { method: "POST", body: fd });
    setUploading(null);
    setSaved(slot);
    setVersion((v) => v + 1);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div className="max-w-lg">
      <p className="text-sm text-gray-500 mb-6">
        These three slides are used for every marketing PPT generated from a project&apos;s Gallery. Upload a
        16:9 image to replace the default for each. Leave any of them unset to keep using the built-in default.
      </p>
      <div className="space-y-6">
        {SLOTS.map((s) => (
          <div key={s.key} className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-800">{s.label}</p>
              {saved === s.key && (
                <span className="flex items-center gap-1 text-xs text-green-600"><Check className="w-3.5 h-3.5" /> Saved</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">{s.help}</p>
            <div className="flex items-center gap-3">
              <img
                src={`/api/settings/ppt-template/${s.key}?v=${version}`}
                alt={s.label}
                className="w-32 aspect-video object-cover rounded-lg border border-gray-200 bg-gray-50"
              />
              <div>
                <input
                  ref={(el) => { inputRefs.current[s.key] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(s.key, e)}
                />
                <button
                  onClick={() => inputRefs.current[s.key]?.click()}
                  disabled={uploading === s.key}
                  className="flex items-center gap-2 text-sm font-medium border border-gray-300 text-gray-700 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploading === s.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading === s.key ? "Uploading…" : configured[s.key] ? "Replace" : "Upload"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
