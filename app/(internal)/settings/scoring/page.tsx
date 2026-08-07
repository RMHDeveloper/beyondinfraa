"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Rule = {
  id: string;
  name: string;
  templateSlug: string;
  criterionKey: string;
  maxScore: number;
  questionLabel: string;
  matchValue: string;
  score: number;
  sortOrder: number;
};

const PROFILES = [
  { slug: "selling-buying",   label: "Selling / Buying" },
  { slug: "special-projects", label: "Special Projects / Redevelopment" },
  { slug: "rental",           label: "Rental / Lease" },
];

const BLANK: Omit<Rule, "id"> = {
  name: "", templateSlug: "selling-buying", criterionKey: "",
  maxScore: 0, questionLabel: "", matchValue: "", score: 0, sortOrder: 0,
};

function RuleForm({
  value, onChange, onSave, onCancel, saving,
}: {
  value: Omit<Rule, "id">;
  onChange: (v: Omit<Rule, "id">) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const f = (key: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Profile */}
        <div className="col-span-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Profile *</label>
          <select value={value.templateSlug} onChange={f("templateSlug")}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            {PROFILES.map(p => <option key={p.slug} value={p.slug}>{p.label}</option>)}
          </select>
        </div>

        {/* Criterion Key */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Criterion Key *</label>
          <input value={value.criterionKey} onChange={f("criterionKey")} placeholder="e.g. mandate, commission"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">Groups rules for the same criterion. All rules sharing a key compete — only the highest match wins.</p>
        </div>

        {/* Max Score */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Max Score (weightage) *</label>
          <input type="number" value={value.maxScore} onChange={f("maxScore")} placeholder="e.g. 30"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">The maximum points this criterion can contribute to the total possible score.</p>
        </div>

        {/* Question Label */}
        <div className="col-span-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Question Label *</label>
          <input value={value.questionLabel} onChange={f("questionLabel")} placeholder="e.g. Do you have a mandate?"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">Must exactly match the question label in the project template (case-insensitive).</p>
        </div>

        {/* Rule Name */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Rule Name *</label>
          <input value={value.name} onChange={f("name")} placeholder="e.g. Mandate – Yes"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        {/* Match Value */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Match Value *</label>
          <input value={value.matchValue} onChange={f("matchValue")} placeholder="e.g. Yes"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <p className="text-[10px] text-gray-400 mt-0.5">The exact answer value that triggers this rule.</p>
        </div>

        {/* Score */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Score (points earned)</label>
          <input type="number" value={value.score} onChange={f("score")} placeholder="e.g. 30"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        {/* Sort Order */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Sort Order</label>
          <input type="number" value={value.sortOrder} onChange={f("sortOrder")} placeholder="e.g. 10"
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} disabled={saving}
          className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={onSave} disabled={saving || !value.name || !value.criterionKey || !value.matchValue}
          className="flex items-center gap-1 text-xs font-bold bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Rule"}
        </button>
      </div>
    </div>
  );
}

export default function ScoringPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<Omit<Rule, "id">>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<Rule, "id">>(BLANK);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  async function load() {
    const res = await fetch("/api/settings/scoring-rules");
    setRules(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function saveNew() {
    setSaving(true);
    await fetch("/api/settings/scoring-rules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAdding(false);
    setAddForm(BLANK);
    setSaving(false);
    load();
  }

  function startEdit(r: Rule) {
    setEditingId(r.id);
    setEditForm({ name: r.name, templateSlug: r.templateSlug, criterionKey: r.criterionKey, maxScore: r.maxScore, questionLabel: r.questionLabel, matchValue: r.matchValue, score: r.score, sortOrder: r.sortOrder });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await fetch("/api/settings/scoring-rules", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    setEditingId(null);
    setSaving(false);
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch("/api/settings/scoring-rules", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  // Group by profile slug, then by criterionKey within each profile
  const byProfile = PROFILES.map(p => {
    const profileRules = rules.filter(r => r.templateSlug === p.slug);
    const byCriterion = profileRules.reduce<Record<string, Rule[]>>((acc, r) => {
      const key = r.criterionKey || "(no criterion key)";
      (acc[key] = acc[key] ?? []).push(r);
      return acc;
    }, {});
    // Compute totalPossible: sum of maxScore per unique criterion key (first rule in group)
    const totalPossible = Object.values(byCriterion).reduce((sum, group) => sum + (group[0]?.maxScore ?? 0), 0);
    return { ...p, byCriterion, totalPossible, count: profileRules.length };
  });

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-gray-500">Configure scoring rules for each property profile. Rules within the same criterion key compete — the first match wins.</p>
        </div>
        <button onClick={() => { setAdding(true); setAddForm(BLANK); }}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <RuleForm value={addForm} onChange={setAddForm} onSave={saveNew} onCancel={() => setAdding(false)} saving={saving} />
      )}

      {/* How scoring works */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <p className="font-bold text-amber-900">How scoring works</p>
        <p><span className="font-semibold">Criterion Key</span> — groups rules for the same question (e.g. all "mandate" variants share the key "mandate"). Only one rule per criterion can match.</p>
        <p><span className="font-semibold">Max Score</span> — the maximum this criterion can add to the total possible score. Set it to the same value on all rules sharing a key.</p>
        <p><span className="font-semibold">Question Label</span> — must match the exact label of the question in the project template (case-insensitive).</p>
        <p><span className="font-semibold">Match Value</span> — the answer that triggers this rule. Score is added when the project's answer equals (or starts with) this value.</p>
        <p><span className="font-semibold">Potential %</span> = total earned ÷ total possible × 100. High ≥ 60%, Medium ≥ 30%, Low &lt; 30%.</p>
      </div>

      {/* Profiles */}
      {byProfile.map(profile => (
        <div key={profile.slug} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Profile header */}
          <button
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
            onClick={() => setCollapsed(p => ({ ...p, [profile.slug]: !p[profile.slug] }))}>
            {collapsed[profile.slug]
              ? <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-bold text-gray-900 text-sm">{profile.label}</span>
            <span className="text-xs text-gray-400">{profile.count} rule{profile.count !== 1 ? "s" : ""}</span>
            <span className="ml-auto text-xs font-bold text-gray-500">
              Total possible: <span className="text-blue-700">{profile.totalPossible} pts</span>
            </span>
          </button>

          {!collapsed[profile.slug] && (
            <div className="divide-y divide-gray-50">
              {Object.entries(profile.byCriterion).map(([criterionKey, criterionRules]) => (
                <div key={criterionKey}>
                  {/* Criterion group header */}
                  <div className="px-4 py-2 bg-gray-50 flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono">{criterionKey}</span>
                    <span className="text-[10px] text-gray-400">{criterionRules.length} option{criterionRules.length !== 1 ? "s" : ""}</span>
                    <span className="ml-auto text-[10px] font-bold text-gray-500">
                      Max: <span className="text-blue-600">{criterionRules[0]?.maxScore ?? 0} pts</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]" title={criterionRules[0]?.questionLabel}>
                      Q: {criterionRules[0]?.questionLabel || "—"}
                    </span>
                  </div>

                  {/* Rules */}
                  {criterionRules.map(r => (
                    <div key={r.id}>
                      {editingId === r.id ? (
                        <div className="px-4 py-3">
                          <RuleForm value={editForm} onChange={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} saving={saving} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                          {/* Score badge */}
                          <div className={cn("w-10 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0",
                            r.score > 0 ? "bg-green-50 text-green-700" : r.score < 0 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500")}>
                            {r.score > 0 ? "+" : ""}{r.score}
                          </div>

                          {/* Name + match value */}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-800">{r.name}</span>
                            <span className="ml-2 text-[10px] text-gray-400">when answer = <span className="font-mono text-gray-600">{r.matchValue}</span></span>
                          </div>

                          {/* Sort order */}
                          <span className="text-[10px] text-gray-300 font-mono flex-shrink-0">#{r.sortOrder}</span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => startEdit(r)}
                              className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => del(r.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {profile.count === 0 && (
                <div className="px-4 py-8 text-center text-xs text-gray-400">
                  No rules for this profile yet. Click "Add Rule" and select this profile.
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {rules.length === 0 && !adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No scoring rules configured yet.</p>
          <p className="text-xs text-gray-400 mt-1">Run the seed script or add rules manually above.</p>
        </div>
      )}
    </div>
  );
}
