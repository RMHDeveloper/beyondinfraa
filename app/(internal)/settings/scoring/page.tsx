"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { cn, blurOnWheel } from "@/lib/utils";
import { resolveScoringProfile } from "@/lib/matching";

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

type TemplateQuestion = { label: string; fieldType: string; options: string[] };
type Template = {
  name: string;
  subcategory: { name: string; category: { name: string } };
  groups: { group: { questions: TemplateQuestion[] } }[];
};

const PROFILES = [
  { slug: "selling-buying", label: "Selling / Buying" },
  { slug: "rental",         label: "Rental / Lease" },
  { slug: "land-sale",      label: "Land Sale" },
  { slug: "joint-venture",  label: "Joint Venture" },
  { slug: "redevelopment",  label: "Joint Development" },
];

const OPTION_TYPES = new Set(["RADIO", "DROPDOWN", "MULTISELECT"]);
const CUSTOM_LABEL = "__custom__";
const CUSTOM_VALUE = "__custom__";

const BLANK: Omit<Rule, "id"> = {
  name: "", templateSlug: "selling-buying", criterionKey: "",
  maxScore: 0, questionLabel: "", matchValue: "", score: 0, sortOrder: 0,
};

// Rules for a profile that don't come from a locked criterion group (top-level "Add Rule").
type LockedContext = { templateSlug: string; criterionKey: string; maxScore: number; questionLabel: string } | null;

function RuleForm({
  value, onChange, onSave, onCancel, saving, questionsByProfile, locked,
}: {
  value: Omit<Rule, "id">;
  onChange: (v: Omit<Rule, "id">) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  questionsByProfile: Record<string, TemplateQuestion[]>;
  locked: LockedContext;
}) {
  const f = (key: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });

  const profileQuestions = questionsByProfile[value.templateSlug] ?? [];
  const matchedQuestion = profileQuestions.find(q => q.label.toLowerCase() === value.questionLabel.toLowerCase());
  const [customLabel, setCustomLabel] = useState(() => !matchedQuestion && !!value.questionLabel);
  const [customValue, setCustomValue] = useState(() => {
    if (!matchedQuestion || !OPTION_TYPES.has(matchedQuestion.fieldType)) return true;
    return !matchedQuestion.options.some(o => o.toLowerCase() === value.matchValue.toLowerCase());
  });

  const showOptionPicker = !customValue && matchedQuestion && OPTION_TYPES.has(matchedQuestion.fieldType);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Profile */}
        <div className="col-span-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Profile *</label>
          {locked ? (
            <p className="mt-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">
              {PROFILES.find(p => p.slug === locked.templateSlug)?.label ?? locked.templateSlug}
            </p>
          ) : (
            <select value={value.templateSlug} onChange={e => { onChange({ ...value, templateSlug: e.target.value, questionLabel: "" }); setCustomLabel(false); }}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              {PROFILES.map(p => <option key={p.slug} value={p.slug}>{p.label}</option>)}
            </select>
          )}
        </div>

        {/* Criterion Key */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Criterion Key *</label>
          {locked ? (
            <p className="mt-1 text-sm font-mono text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">{locked.criterionKey}</p>
          ) : (
            <>
              <input value={value.criterionKey} onChange={f("criterionKey")} placeholder="e.g. mandate, commission"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <p className="text-[10px] text-gray-400 mt-0.5">Groups rules for the same criterion. All rules sharing a key compete — only the highest match wins.</p>
            </>
          )}
        </div>

        {/* Max Score */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Max Score (weightage) *</label>
          {locked ? (
            <p className="mt-1 text-sm font-mono text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">{locked.maxScore} pts</p>
          ) : (
            <>
              <input type="number" value={value.maxScore} onChange={f("maxScore")} placeholder="e.g. 30" onWheel={blurOnWheel}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <p className="text-[10px] text-gray-400 mt-0.5">The maximum points this criterion can contribute to the total possible score.</p>
            </>
          )}
        </div>

        {/* Question Label */}
        <div className="col-span-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Question Label *</label>
          {locked ? (
            <p className="mt-1 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">{locked.questionLabel || "—"}</p>
          ) : customLabel || profileQuestions.length === 0 ? (
            <div className="space-y-1">
              <input value={value.questionLabel} onChange={f("questionLabel")} placeholder="e.g. Do you have a mandate?"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {profileQuestions.length > 0 && (
                <button type="button" onClick={() => setCustomLabel(false)} className="text-[10px] text-blue-600 hover:underline">
                  ← choose from template questions instead
                </button>
              )}
            </div>
          ) : (
            <select
              value={matchedQuestion ? value.questionLabel : ""}
              onChange={e => {
                if (e.target.value === CUSTOM_LABEL) { setCustomLabel(true); onChange({ ...value, questionLabel: "" }); return; }
                onChange({ ...value, questionLabel: e.target.value, matchValue: "" });
                setCustomValue(false);
              }}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              <option value="" disabled>Select a question…</option>
              {profileQuestions.map(q => (
                <option key={q.label} value={q.label}>{q.label} ({q.fieldType})</option>
              ))}
              <option value={CUSTOM_LABEL}>Custom / type manually…</option>
            </select>
          )}
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
          {showOptionPicker ? (
            <div className="space-y-1">
              <select value={value.matchValue} onChange={f("matchValue")}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="" disabled>Select an option…</option>
                {matchedQuestion!.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <button type="button" onClick={() => setCustomValue(true)} className="text-[10px] text-blue-600 hover:underline">
                ← type a custom value / range instead
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <input value={value.matchValue} onChange={f("matchValue")} placeholder="e.g. Yes, or >2, or 1 to 2"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {matchedQuestion && OPTION_TYPES.has(matchedQuestion.fieldType) && matchedQuestion.options.length > 0 && (
                <button type="button" onClick={() => setCustomValue(false)} className="text-[10px] text-blue-600 hover:underline">
                  ← choose from this question's options instead
                </button>
              )}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-0.5">The answer that triggers this rule. Numeric criteria can use a range like "&gt;2", "1 to 2", or "&gt;=30".</p>
        </div>

        {/* Score */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Score (points earned)</label>
          <input type="number" value={value.score} onChange={f("score")} placeholder="e.g. 30" onWheel={blurOnWheel}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        {/* Sort Order */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Sort Order</label>
          <input type="number" value={value.sortOrder} onChange={f("sortOrder")} placeholder="e.g. 10" onWheel={blurOnWheel}
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

function EditCriterionForm({
  criterionKey, maxScore, questionLabel, onSave, onCancel, saving,
}: {
  criterionKey: string;
  maxScore: number;
  questionLabel: string;
  onSave: (v: { criterionKey: string; maxScore: number; questionLabel: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [key, setKey] = useState(criterionKey);
  const [max, setMax] = useState(String(maxScore));
  const [label, setLabel] = useState(questionLabel);

  return (
    <div className="px-4 py-3 bg-gray-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Criterion Key</label>
          <input value={key} onChange={e => setKey(e.target.value)}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Max Score</label>
          <input type="number" value={max} onChange={e => setMax(e.target.value)} onWheel={blurOnWheel}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Question Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
        </div>
      </div>
      <p className="text-[10px] text-gray-400">Applies to all {`options in this group`} at once.</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-white">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button onClick={() => onSave({ criterionKey: key, maxScore: Number(max) || 0, questionLabel: label })} disabled={saving || !key}
          className="flex items-center gap-1 text-xs font-bold bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Criterion"}
        </button>
      </div>
    </div>
  );
}

export default function ScoringPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<Omit<Rule, "id">>(BLANK);
  const [addLocked, setAddLocked] = useState<LockedContext>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<Rule, "id">>(BLANK);
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  async function load() {
    const res = await fetch("/api/settings/scoring-rules");
    setRules(await res.json());
  }
  useEffect(() => {
    load();
    fetch("/api/settings/templates").then(r => r.json()).then(setTemplates);
  }, []);

  // Group each template's questions under the scoring profile it resolves to.
  const questionsByProfile = useMemo(() => {
    const map: Record<string, TemplateQuestion[]> = {};
    for (const t of templates) {
      const profile = resolveScoringProfile(t.subcategory.category.name, t.subcategory.name, t.name);
      const questions = t.groups.flatMap(tg => tg.group.questions);
      const existing = map[profile] ?? [];
      for (const q of questions) {
        if (!existing.some(e => e.label.toLowerCase() === q.label.toLowerCase())) existing.push(q);
      }
      map[profile] = existing;
    }
    return map;
  }, [templates]);

  function openTopLevelAdd() {
    setAddLocked(null);
    setAddForm(BLANK);
    setAdding(true);
  }

  function openAddOption(profileSlug: string, criterionKey: string, maxScore: number, questionLabel: string) {
    setAddLocked({ templateSlug: profileSlug, criterionKey, maxScore, questionLabel });
    setAddForm({ ...BLANK, templateSlug: profileSlug, criterionKey, maxScore, questionLabel });
    setAdding(true);
  }

  async function saveNew() {
    setSaving(true);
    await fetch("/api/settings/scoring-rules", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAdding(false);
    setAddForm(BLANK);
    setAddLocked(null);
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

  async function saveCriterion(criterionRules: Rule[], v: { criterionKey: string; maxScore: number; questionLabel: string }) {
    setSaving(true);
    await Promise.all(criterionRules.map(r =>
      fetch("/api/settings/scoring-rules", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, criterionKey: v.criterionKey, maxScore: v.maxScore, questionLabel: v.questionLabel }),
      })
    ));
    setEditingCriterion(null);
    setSaving(false);
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
        <button onClick={openTopLevelAdd}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Add Rule (new criterion)
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <RuleForm value={addForm} onChange={setAddForm} onSave={saveNew} onCancel={() => { setAdding(false); setAddLocked(null); }}
          saving={saving} questionsByProfile={questionsByProfile} locked={addLocked} />
      )}

      {/* How scoring works */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <p className="font-bold text-amber-900">How scoring works</p>
        <p><span className="font-semibold">Criterion Key</span> — groups rules for the same question (e.g. all "mandate" variants share the key "mandate"). Only one rule per criterion can match.</p>
        <p><span className="font-semibold">Max Score</span> — the maximum this criterion can add to the total possible score. Set it to the same value on all rules sharing a key.</p>
        <p><span className="font-semibold">Question Label</span> — must match the exact label of the question in the project template (case-insensitive).</p>
        <p><span className="font-semibold">Match Value</span> — the answer that triggers this rule. Score is added when the project's answer equals (or starts with) this value.</p>
        <p><span className="font-semibold">Potential %</span> = total earned ÷ total possible × 100. High ≥ 60%, Medium ≥ 30%, Low &lt; 30%.</p>
        <p>Use <span className="font-semibold">+ Add Option</span> on a criterion group to add another answer/score to an existing question — its profile, key, and max score are filled in for you.</p>
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
                  {editingCriterion === `${profile.slug}:${criterionKey}` ? (
                    <EditCriterionForm
                      criterionKey={criterionKey === "(no criterion key)" ? "" : criterionKey}
                      maxScore={criterionRules[0]?.maxScore ?? 0}
                      questionLabel={criterionRules[0]?.questionLabel ?? ""}
                      saving={saving}
                      onCancel={() => setEditingCriterion(null)}
                      onSave={v => saveCriterion(criterionRules, v)}
                    />
                  ) : (
                    <div className="px-4 py-2 bg-gray-50 flex items-center gap-3 group">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono">{criterionKey}</span>
                      <span className="text-[10px] text-gray-400">{criterionRules.length} option{criterionRules.length !== 1 ? "s" : ""}</span>
                      <span className="text-[10px] font-bold text-gray-500">
                        Max: <span className="text-blue-600">{criterionRules[0]?.maxScore ?? 0} pts</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]" title={criterionRules[0]?.questionLabel}>
                        Q: {criterionRules[0]?.questionLabel || "—"}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => setEditingCriterion(`${profile.slug}:${criterionKey}`)}
                          className="flex items-center gap-1 text-[10px] font-bold text-gray-500 border border-gray-200 px-2 py-1 rounded-lg hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Pencil className="w-3 h-3" /> Edit Criterion
                        </button>
                        <button onClick={() => openAddOption(profile.slug, criterionKey === "(no criterion key)" ? "" : criterionKey, criterionRules[0]?.maxScore ?? 0, criterionRules[0]?.questionLabel ?? "")}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 border border-blue-200 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100">
                          <Plus className="w-3 h-3" /> Add Option
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rules */}
                  {criterionRules.map(r => (
                    <div key={r.id}>
                      {editingId === r.id ? (
                        <div className="px-4 py-3">
                          <RuleForm value={editForm} onChange={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)}
                            saving={saving} questionsByProfile={questionsByProfile} locked={null} />
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
