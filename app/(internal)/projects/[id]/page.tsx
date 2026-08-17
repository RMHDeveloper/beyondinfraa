"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Lock, Unlock, Check, Loader2,
  AlertCircle, Download, Printer,
  TrendingUp, Plus, Handshake, Users, Building2,
  Pencil, Share2, ChevronDown, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import FieldRenderer from "@/components/project/FieldRenderer";
import { useAutosave } from "@/components/project/useAutosave";
import FilesTab from "@/components/project/FilesTab";
import NotesTab from "@/components/project/NotesTab";
import FollowUpsTab from "@/components/project/FollowUpsTab";
import AuditTab from "@/components/project/AuditTab";
import CustomFieldsSection from "@/components/CustomFieldsSection";
import FindRequirementsPanel from "@/components/project/FindRequirementsPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
type Question = {
  id: string; label: string; fieldType: string; isRequired: boolean;
  isInternal: boolean; options: string[]; unit: string | null; helpText: string | null;
  conditionalJson: { parentLabel: string; matchValue: string } | null;
  autoCalcJson: { formula: string; sourceField: string } | null;
  sortOrder: number;
};
type Group = { id: string; name: string; isShared: boolean; questions: Question[] };
type TemplateGroup = { id: string; sortOrder: number; group: Group };
type Response = { questionId: string; value: string | null; jsonValue: unknown };
type Project = {
  id: string; projectNumber: string; title: string; state: string;
  potentialScore: number | null; clientName: string | null;
  category: { name: string }; subcategory: { name: string };
  status: { id: string; name: string; color: string } | null;
  template: { name: string; groups: TemplateGroup[] };
  responses: Response[];
  createdAt?: string;
};

// ─── Score breakdown type ─────────────────────────────────────────────────────
type ScoreBreakdown = {
  profile: string;
  breakdown: { name: string; score: number; maxScore: number; matched: boolean; criterionKey: string }[];
  totalEarned: number;
  totalPossible: number;
  potentialScore: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTOR_COLORS: Record<string, string> = {
  Residential: "#2563eb", Commercial: "#d97706",
  Industrial: "#7c3aed", Redevelopment: "#0d9488", "Special Projects": "#0d9488",
};

const BASE_TABS = [
  "Project Overview", "Find Buyers/Tenants", "Files", "Notes", "Tasks",
  "Negotiation Log", "Meetings", "Timeline", "Audit",
];
const REDEVELOPMENT_TABS = [...BASE_TABS, "Developers & Proposals", "Closure"];

function getDetailTabs(categoryName: string, subcategoryName: string) {
  const isRedevelopment = categoryName === "Special Projects" ||
    subcategoryName === "Joint Venture" || subcategoryName === "Redevelopment";
  return isRedevelopment ? REDEVELOPMENT_TABS : BASE_TABS;
}

// ─── Small circle progress ────────────────────────────────────────────────────
function MiniProgress({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── Legal & Compliance Tab ───────────────────────────────────────────────────
const LEGAL_ITEMS = [
  "Encumbrance Certificate (EC)",
  "Title Deed / Sale Deed",
  "Patta / Chitta",
  "Approved Building Plan",
  "Completion Certificate",
  "RERA Registration",
  "Property Tax Receipt (latest)",
  "NOC from Bank (if mortgaged)",
  "Khata Certificate",
  "Land Use Certificate",
];

function LegalTab({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/legal`).then(r => r.json()).then((d) => {
      setChecked(d.checked ?? {});
      setNotes(d.notes ?? {});
      setLoaded(true);
    });
  }, [projectId]);

  async function save() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}/legal`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked, notes }),
    });
    setSaving(false);
  }

  const doneCount = LEGAL_ITEMS.filter(i => checked[i]).length;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold text-gray-900 text-sm">Legal Checklist</p>
          <p className="text-xs text-gray-400 mt-0.5">{doneCount} / {LEGAL_ITEMS.length} documents collected</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-gray-100 rounded-full">
            <div className="h-1.5 rounded-full bg-green-500 transition-all" style={{ width: `${(doneCount/LEGAL_ITEMS.length)*100}%` }} />
          </div>
          {!readOnly && (
            <button onClick={save} disabled={saving || !loaded}
              className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {LEGAL_ITEMS.map(item => (
          <div key={item} className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={!!checked[item]} disabled={readOnly || !loaded}
                onChange={e => setChecked(p => ({ ...p, [item]: e.target.checked }))}
                className="mt-0.5 w-4 h-4 rounded accent-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", checked[item] ? "text-green-700 line-through" : "text-gray-800")}>{item}</p>
                <input
                  type="text"
                  value={notes[item] ?? ""}
                  disabled={readOnly}
                  onChange={e => setNotes(p => ({ ...p, [item]: e.target.value }))}
                  placeholder="Add note (reference #, date, etc.)"
                  className="mt-1 w-full text-xs border border-gray-100 rounded-lg px-2 py-1 text-gray-500 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50 disabled:bg-transparent disabled:border-transparent"
                />
              </div>
              {checked[item] && <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Meetings Tab ─────────────────────────────────────────────────────────────
type Meeting = { id: string; title: string; attendees: string; scheduledAt: string; notes: string | null; outcome: string | null };

function MeetingsTab({ projectId }: { projectId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", attendees: "", scheduledAt: "", notes: "", outcome: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch(`/api/projects/${projectId}/meetings`);
    setMeetings(await r.json());
  }
  useEffect(() => { load(); }, [projectId]);

  async function addMeeting() {
    if (!form.title || !form.scheduledAt) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/meetings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await load();
    setShowForm(false);
    setForm({ title: "", attendees: "", scheduledAt: "", notes: "", outcome: "" });
    setSaving(false);
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-gray-900 text-sm">Meetings</span>
          <span className="text-xs text-gray-400">({meetings.length})</span>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
          <Plus className="w-3.5 h-3.5" /> Log Meeting
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-1 sm:col-span-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Meeting Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Site visit debrief, Owner discussion"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date & Time *</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Attendees</label>
              <input value={form.attendees} onChange={e => setForm(p => ({ ...p, attendees: e.target.value }))}
                placeholder="Names, comma-separated"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Discussion points, decisions…"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Outcome / Next Steps</label>
              <input value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))}
                placeholder="e.g. Owner agreed to proceed, Send proposal by Friday"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addMeeting} disabled={saving}
              className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save Meeting"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-gray-200 text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {meetings.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No meetings logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-semibold text-gray-900 text-sm">{m.title}</p>
                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                  {new Date(m.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {m.attendees && <p className="text-xs text-gray-500 mb-1">👥 {m.attendees}</p>}
              {m.notes && <p className="text-xs text-gray-600 leading-relaxed mb-2">{m.notes}</p>}
              {m.outcome && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">
                  <span className="font-semibold">Next: </span>{m.outcome}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────
type TimelineEntry = { id: string; action: string; entityType: string | null; createdAt: string; user?: { name: string } | null };

const TIMELINE_ICONS: Record<string, { icon: string; color: string }> = {
  CREATE:       { icon: "✦", color: "#2563eb" },
  UPDATE:       { icon: "✎", color: "#0891b2" },
  LOCK:         { icon: "🔒", color: "#d97706" },
  UNLOCK:       { icon: "🔓", color: "#059669" },
  ARCHIVE:      { icon: "📦", color: "#6b7280" },
  FILE_UPLOAD:  { icon: "📎", color: "#7c3aed" },
  FILE_DELETE:  { icon: "🗑", color: "#dc2626" },
  OTP_SENT:     { icon: "📲", color: "#0891b2" },
  OTP_VERIFIED: { icon: "✅", color: "#059669" },
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Project created",
  UPDATE: "Field updated",
  LOCK: "Project locked",
  UNLOCK: "Project unlocked",
  ARCHIVE: "Project archived",
  FILE_UPLOAD: "File uploaded",
  FILE_DELETE: "File deleted",
  OTP_SENT: "Client OTP sent",
  OTP_VERIFIED: "Client verified",
};

function TimelineTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  useEffect(() => {
    fetch(`/api/projects/${projectId}/audit`).then(r => r.json()).then(setEntries);
  }, [projectId]);

  if (entries.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No activity yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative pl-6 space-y-0">
        {/* Vertical line */}
        <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200" />
        {entries.map((e, i) => {
          const meta = TIMELINE_ICONS[e.action] ?? { icon: "•", color: "#9ca3af" };
          return (
            <div key={e.id} className="relative flex items-start gap-3 pb-4">
              {/* Dot */}
              <div className="absolute -left-3.5 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-xs flex-shrink-0"
                style={{ borderColor: meta.color, top: "2px" }}>
                <span style={{ fontSize: "10px" }}>{meta.icon}</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800">{ACTION_LABELS[e.action] ?? e.action}</p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {e.entityType && e.entityType !== "project" && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{e.entityType}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Closure Tab ─────────────────────────────────────────────────────────────
const BLANK_CLOSURE = {
  selectedDeveloper: "",
  finalAdditionalArea: "",
  finalCorpus: "",
  finalRent: "",
  finalTimeline: "",
  bankGuarantee: "",
  agreementDate: "",
  registrationDate: "",
  biplCommission: "",
  paymentStatus: "Pending",
  commerciallyClosed: false,
  projectCompleted: false,
  closureNotes: "",
};
type ClosureData = typeof BLANK_CLOSURE;

function ClosureTab({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const [data, setData] = useState<ClosureData>(BLANK_CLOSURE);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/closure`).then(r => r.json()).then((d: Partial<ClosureData>) => {
      setData({ ...BLANK_CLOSURE, ...d });
      setLoaded(true);
    });
  }, [projectId]);

  async function save() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}/closure`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
  }

  function field(label: string, key: keyof ClosureData, type: "text" | "number" | "date" = "text") {
    return (
      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
        <input type={type} value={data[key] as string} disabled={readOnly || !loaded}
          onChange={e => setData(p => ({ ...p, [key]: e.target.value }))}
          className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold text-gray-900 text-sm">Redevelopment Closure</p>
          <p className="text-xs text-gray-400 mt-0.5">Record final agreed terms and deal milestones.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 cursor-pointer">
            <input type="checkbox" checked={data.commerciallyClosed} disabled={readOnly}
              onChange={e => setData(p => ({ ...p, commerciallyClosed: e.target.checked }))}
              className="w-4 h-4 rounded accent-teal-600" />
            Commercially Closed
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-green-700 cursor-pointer">
            <input type="checkbox" checked={data.projectCompleted} disabled={readOnly}
              onChange={e => setData(p => ({ ...p, projectCompleted: e.target.checked }))}
              className="w-4 h-4 rounded accent-green-600" />
            Project Completed
          </label>
          {!readOnly && (
            <button onClick={save} disabled={saving || !loaded}
              className="text-xs font-bold bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>

      {(data.commerciallyClosed || data.projectCompleted) && (
        <div className={cn("rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-bold",
          data.projectCompleted ? "bg-green-100 text-green-700" : "bg-teal-50 text-teal-700")}>
          <Check className="w-4 h-4 flex-shrink-0" />
          {data.projectCompleted ? "Project Completed" : "Commercially Closed"}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Selected Developer & Final Terms</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Selected Developer", "selectedDeveloper")}
          {field("Final Additional Area (sqft)", "finalAdditionalArea", "number")}
          {field("Final Corpus Fund (₹)", "finalCorpus", "number")}
          {field("Final Monthly Rent (₹)", "finalRent", "number")}
          {field("Final Construction Timeline (months)", "finalTimeline", "number")}
          {field("Bank Guarantee", "bankGuarantee")}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Agreement & Registration</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field("Agreement Date", "agreementDate", "date")}
          {field("Registration Date", "registrationDate", "date")}
          {field("BIPL Commission (₹)", "biplCommission", "number")}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Payment Status</label>
            <select value={data.paymentStatus} disabled={readOnly || !loaded}
              onChange={e => setData(p => ({ ...p, paymentStatus: e.target.value }))}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white disabled:bg-gray-50">
              {["Pending","Partial","Received"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Closure Notes</label>
        <textarea rows={4} value={data.closureNotes} disabled={readOnly || !loaded}
          onChange={e => setData(p => ({ ...p, closureNotes: e.target.value }))}
          placeholder="Additional notes on deal closure, pending items, conditions…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none disabled:bg-gray-50 disabled:text-gray-400" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject]           = useState<Project | null>(null);
  const [loading, setLoading]           = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [localValues, setLocalValues]   = useState<Record<string, string>>({});
  const [localJsonValues, setLocalJsonValues] = useState<Record<string, unknown>>({});
  const [stateLoading, setStateLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [activeTab, setActiveTab]       = useState(() => {
    if (typeof window === "undefined") return "Project Overview";
    return new URLSearchParams(window.location.search).get("tab") ?? "Project Overview";
  });
  const [globalEdit, setGlobalEdit]     = useState(false);

  // Re-sync the active tab when navigating here (even to the same route) with a ?tab= param,
  // e.g. clicking "Open Negotiation Log" from a Proposal card while this page is already mounted.
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) setActiveTab(tabParam);
  }, [id, searchParams]);

  // Extra data (per-project relationships)
  const [extraData, setExtraData] = useState<{
    ownerUnits: any[]; negotiations: any[]; developerProposals: any[]; matches: any[]; proposals: any[]; developers: any[];
  } | null>(null);

  // Owner unit form (add + edit)
  const BLANK_OWNER = { unitNumber: "", ownerName: "", phone: "", email: "", existingArea: "", uds: "", occupancyStatus: "", consentStatus: "NOT_CONTACTED", conditions: "", meetingAttended: false, notes: "" };
  const [addOwnerForm, setAddOwnerForm] = useState(false);
  const [ownerForm, setOwnerForm] = useState<typeof BLANK_OWNER>(BLANK_OWNER);
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null);

  // Developer proposal form
  const BLANK_DEV = { developerId: "", status: "NOT_CONTACTED", additionalArea: "", corpusFund: "", monthlyRent: "", deposit: "", constructionTimeline: "", gracePeriod: "", bankGuarantee: "", parking: "", amenities: "", internalRemarks: "" };
  const [addDevForm, setAddDevForm] = useState(false);
  const [devForm, setDevForm] = useState<typeof BLANK_DEV>(BLANK_DEV);
  const [editingDevId, setEditingDevId] = useState<string | null>(null);
  const [devCompareMode, setDevCompareMode] = useState(false);

  // Negotiation round form
  const BLANK_ROUND = { offerBy: "buyer", offerAmount: "", notes: "" };
  const [addRoundNegId, setAddRoundNegId] = useState<string | null>(null);
  const [roundForm, setRoundForm] = useState<typeof BLANK_ROUND>(BLANK_ROUND);

  // Close deal form
  const BLANK_DEAL = { dealType: "SOLD", finalPrice: "", finalRent: "", closureDate: new Date().toISOString().slice(0, 10), notes: "" };
  const [closeDealNegId, setCloseDealNegId] = useState<string | null>(null);
  const [dealForm, setDealForm] = useState<typeof BLANK_DEAL>(BLANK_DEAL);

  // Score breakdown
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);

  // Status dropdown
  const [allStatuses, setAllStatuses] = useState<{ id: string; name: string; color: string }[]>([]);
  const [statusDropdown, setStatusDropdown] = useState(false);

  // Client portal
  const [clientPhone, setClientPhone] = useState("");
  const [clientLinkUrl, setClientLinkUrl] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPortal, setShowPortal] = useState(false);


  const { status: saveStatus, debouncedSave, immediateSave } = useAutosave(id);

  const load = useCallback(async () => {
    const safeJson = async (r: globalThis.Response) => {
      try { return r.ok ? await r.json() : null; }
      catch { return null; }
    };

    const [projRes, extraRes, scoreRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/extra`),
      fetch(`/api/projects/${id}/score-breakdown`),
    ]);

    type ExtraData = NonNullable<typeof extraData>;
    const [data, extra, score]: [Project | null, ExtraData | null, ScoreBreakdown | null] = await Promise.all([
      safeJson(projRes),
      safeJson(extraRes),
      safeJson(scoreRes),
    ]);

    if (!data) { setLoading(false); return; }
    setProject(data);
    if (extra) setExtraData(extra);
    if (score) setScoreBreakdown(score);

    const vals: Record<string, string> = {};
    const jsonVals: Record<string, unknown> = {};
    for (const r of data.responses) {
      vals[r.questionId] = r.value ?? "";
      if (r.jsonValue !== null) jsonVals[r.questionId] = r.jsonValue;
    }
    setLocalValues(vals);
    setLocalJsonValues(jsonVals);
    const exp: Record<string, boolean> = {};
    for (const tg of data.template.groups) exp[tg.id] = false;
    setExpandedGroups(exp);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/settings/statuses").then(r => r.json()).then(setAllStatuses);
  }, []);

  async function changeStatus(statusId: string) {
    setStatusDropdown(false);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusId }),
    });
    await load();
  }

  async function generateLink() {
    if (!clientPhone.trim()) return;
    setLinkLoading(true);
    const res = await fetch(`/api/projects/${id}/client-link`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: clientPhone.trim() }),
    });
    setClientLinkUrl((await res.json()).url);
    setLinkLoading(false);
  }

  async function reloadExtra() {
    const fresh = await fetch(`/api/projects/${id}/extra`).then(r => r.json());
    setExtraData(fresh);
  }

  async function saveOwnerUnit() {
    if (!ownerForm.unitNumber || !ownerForm.ownerName) return;
    const method = editingOwnerId ? "PATCH" : "POST";
    await fetch(`/api/projects/${id}/extra`, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ownerUnit", id: editingOwnerId, ...ownerForm }),
    });
    await reloadExtra();
    setAddOwnerForm(false);
    setEditingOwnerId(null);
    setOwnerForm(BLANK_OWNER);
  }

  function startEditOwner(u: any) {
    setOwnerForm({
      unitNumber: u.unitNumber ?? "", ownerName: u.ownerName ?? "", phone: u.phone ?? "",
      email: u.email ?? "", existingArea: u.existingArea ?? "", uds: u.uds ?? "",
      occupancyStatus: u.occupancyStatus ?? "", consentStatus: u.consentStatus ?? "NOT_CONTACTED",
      conditions: u.conditions ?? "", meetingAttended: u.meetingAttended ?? false, notes: u.notes ?? "",
    });
    setEditingOwnerId(u.id);
    setAddOwnerForm(true);
  }

  async function deleteOwnerUnit(unitId: string) {
    if (!confirm("Delete this owner unit?")) return;
    await fetch(`/api/projects/${id}/extra`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ownerUnit", id: unitId }),
    });
    await reloadExtra();
  }

  async function saveDevProposal() {
    if (!devForm.developerId) return;
    const method = editingDevId ? "PATCH" : "POST";
    const res = await fetch(`/api/projects/${id}/extra`, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "developerProposal", id: editingDevId, ...devForm }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to save");
      return;
    }
    await reloadExtra();
    setAddDevForm(false);
    setEditingDevId(null);
    setDevForm(BLANK_DEV);
  }

  function startEditDev(dp: any) {
    setDevForm({
      developerId: dp.developerId, status: dp.status,
      additionalArea: dp.additionalArea ?? "", corpusFund: dp.corpusFund ?? "",
      monthlyRent: dp.monthlyRent ?? "", deposit: dp.deposit ?? "",
      constructionTimeline: dp.constructionTimeline ?? "", gracePeriod: dp.gracePeriod ?? "",
      bankGuarantee: dp.bankGuarantee ?? "", parking: dp.parking ?? "",
      amenities: dp.amenities ?? "", internalRemarks: dp.internalRemarks ?? "",
    });
    setEditingDevId(dp.id);
    setAddDevForm(true);
  }

  async function updateDevStatus(dpId: string, status: string) {
    const res = await fetch(`/api/projects/${id}/extra`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "developerProposal", id: dpId, status }),
    });
    if (!res.ok) { const e = await res.json(); alert(e.error ?? "Failed"); return; }
    await reloadExtra();
  }

  async function deleteDevProposal(dpId: string) {
    if (!confirm("Remove this developer proposal?")) return;
    await fetch(`/api/projects/${id}/extra`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "developerProposal", id: dpId }),
    });
    await reloadExtra();
  }

  async function startNegotiationWithDev(contactId: string) {
    const res = await fetch(`/api/projects/${id}/negotiations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (!res.ok) { const e = await res.json(); alert(e.error ?? "Failed to start negotiation"); return; }
    await reloadExtra();
    setActiveTab("Negotiation Log");
  }

  async function addNegotiationRound(negotiationId: string, roundNumber: number) {
    if (!roundForm.offerAmount) return;
    await fetch(`/api/projects/${id}/extra`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "negotiationRound", negotiationId, roundNumber, ...roundForm }),
    });
    await reloadExtra();
    setAddRoundNegId(null);
    setRoundForm(BLANK_ROUND);
  }

  async function updateNegotiationStatus(negotiationId: string, status: string) {
    await fetch(`/api/projects/${id}/extra`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "negotiation", id: negotiationId, status }),
    });
    await reloadExtra();
  }

  async function closeDeal(contactId: string) {
    if (!dealForm.finalPrice && !dealForm.finalRent) return;
    const res = await fetch(`/api/projects/${id}/extra`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "deal", contactId, ...dealForm }),
    });
    if (!res.ok) { const e = await res.json(); alert(e.error ?? "Failed to close deal"); return; }
    await reloadExtra();
    setCloseDealNegId(null);
    setDealForm(BLANK_DEAL);
  }

  const labelValueMap: Record<string, string> = {};
  if (project) {
    for (const tg of project.template.groups)
      for (const q of tg.group.questions)
        labelValueMap[q.label] = localValues[q.id] ?? "";
  }

  function isVisible(q: Question) {
    if (!q.conditionalJson) return true;
    return labelValueMap[q.conditionalJson.parentLabel] === q.conditionalJson.matchValue;
  }

  function handleChange(q: Question, value: string | null, jsonValue?: unknown) {
    setLocalValues(p => ({ ...p, [q.id]: value ?? "" }));
    if (jsonValue !== undefined) setLocalJsonValues(p => ({ ...p, [q.id]: jsonValue }));
    const immediate = ["RADIO","DROPDOWN","MULTISELECT","REPEATER","DATE"].includes(q.fieldType);
    if (immediate) immediateSave(q.id, value, jsonValue);
    else debouncedSave(q.id, value ?? "");
  }

  async function changeState(state: string) {
    setStateLoading(true);
    await fetch(`/api/projects/${id}/state`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    await load();
    setStateLoading(false);
  }

  async function duplicateProject() {
    if (!confirm("Create a duplicate of this property with all its current field values?")) return;
    setDuplicating(true);
    const res = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
    setDuplicating(false);
    if (!res.ok) { alert("Failed to duplicate property"); return; }
    const created = await res.json();
    router.push(`/projects/${created.id}`);
  }

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading…</div>;
  if (!project) return <div className="p-4 sm:p-8 text-red-500 text-sm">Project not found.</div>;

  const isLocked   = project.state === "LOCKED";
  const isArchived = project.state === "ARCHIVED";
  const readOnly   = isLocked || isArchived;
  const sectorColor = SECTOR_COLORS[project.category.name] ?? "#64748b";

  const allQs = project.template.groups.flatMap(tg => tg.group.questions.filter(q => !q.autoCalcJson));
  const filled = allQs.filter(q => localValues[q.id]?.trim()).length;
  const completionPct = allQs.length > 0 ? Math.round((filled / allQs.length) * 100) : 0;
  const scoreVal = project.potentialScore ?? 0;

  const consentColors: Record<string, string> = {
    NOT_CONTACTED:       "bg-gray-100 text-gray-500",
    AGREED:              "bg-green-50 text-green-700",
    NOT_AGREED:          "bg-red-50 text-red-700",
    UNDECIDED:           "bg-amber-50 text-amber-700",
    CONDITIONAL_CONSENT: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">

      {/* ── Compact single-row header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 h-12 flex items-center gap-3 flex-shrink-0 overflow-x-auto no-scrollbar">
        {/* Title — first */}
        <h1 className="text-sm font-bold text-gray-900 truncate min-w-0 max-w-[220px]">{project.title}</h1>

        {/* Project number */}
        <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
          {project.projectNumber}
        </span>

        {/* Category · Subcategory */}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0"
          style={{ background: sectorColor + "18", color: sectorColor }}>
          {project.category.name} · {project.subcategory.name}
        </span>

        {/* Status — clickable dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setStatusDropdown(v => !v)}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors hover:opacity-80"
            style={project.status
              ? { borderColor: project.status.color, color: project.status.color, background: project.status.color + "12" }
              : { borderColor: "#d1d5db", color: "#6b7280", background: "#f9fafb" }}>
            {project.status?.name ?? "No Status"}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {statusDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusDropdown(false)} />
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                {allStatuses.map(s => (
                  <button key={s.id} onClick={() => changeStatus(s.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="font-medium text-gray-800">{s.name}</span>
                    {project.status?.id === s.id && <Check className="w-3 h-3 text-green-500 ml-auto" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Score pill */}
        {(() => {
          const earned = scoreBreakdown?.totalEarned ?? scoreVal;
          const possible = scoreBreakdown?.totalPossible ?? 0;
          const pct = possible > 0 ? Math.round((Math.max(0, earned) / possible) * 100) : 0;
          const scoreLabel = pct >= 60 ? "High" : pct >= 30 ? "Medium" : "Low";
          const scoreColor = pct >= 60 ? { bg: "#dcfce7", text: "#15803d", border: "#86efac" }
            : pct >= 30 ? { bg: "#fef9c3", text: "#a16207", border: "#fde047" }
            : { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5" };
          return possible > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 cursor-pointer"
              style={{ background: scoreColor.bg, color: scoreColor.text, borderColor: scoreColor.border }}
              onClick={() => setActiveTab("Project Overview")}>
              {scoreLabel} · {earned}/{possible}
            </span>
          ) : null;
        })()}

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Save status */}
        <span className="text-[10px] text-gray-400 flex-shrink-0 hidden sm:flex items-center gap-1">
          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving…</>}
          {saveStatus === "saved"  && <><Check className="w-3 h-3 text-green-500" />Saved</>}
          {saveStatus === "error"  && <><AlertCircle className="w-3 h-3 text-red-500" />Error</>}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={duplicateProject} disabled={duplicating}
            title="Create a copy of this property with all field values"
            className="flex items-center gap-1 text-[10px] font-bold border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors disabled:opacity-50">
            <Copy className="w-3 h-3" /> {duplicating ? "Duplicating…" : "Duplicate"}
          </button>

          {/* Share to client */}
          <div className="relative">
            <button onClick={() => setShowPortal(v => !v)}
              className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors",
                showPortal ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
              <Share2 className="w-3 h-3" /> Share
            </button>
            {showPortal && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPortal(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 w-64">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Send Client Portal Link</p>
                  <div className="flex gap-1.5 mb-2">
                    <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                      placeholder="Client phone"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={generateLink} disabled={!clientPhone.trim() || linkLoading}
                      className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {linkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send"}
                    </button>
                  </div>
                  {clientLinkUrl && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center gap-2">
                      <p className="text-[10px] text-gray-600 flex-1 min-w-0 truncate font-mono">{clientLinkUrl}</p>
                      <button onClick={() => { navigator.clipboard.writeText(clientLinkUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="text-gray-400 hover:text-blue-600 flex-shrink-0">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <span className="text-[10px] font-bold">Copy</span>}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {project.state === "OPEN" && (
            <button onClick={() => changeState("LOCKED")} disabled={stateLoading}
              className="flex items-center gap-1 text-[10px] font-bold border border-amber-300 text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors">
              <Lock className="w-3 h-3" /> Lock
            </button>
          )}
          {project.state === "LOCKED" && (
            <button onClick={() => changeState("OPEN")} disabled={stateLoading}
              className="flex items-center gap-1 text-[10px] font-bold border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors">
              <Unlock className="w-3 h-3" /> Unlock
            </button>
          )}
          {project.state === "ARCHIVED" && (
            <button onClick={() => changeState("OPEN")} disabled={stateLoading}
              className="flex items-center gap-1 text-[10px] font-bold border border-green-300 text-green-700 px-2 py-1 rounded hover:bg-green-50 transition-colors">
              <Unlock className="w-3 h-3" /> Restore
            </button>
          )}
          {project.state !== "ARCHIVED" && (
            <button onClick={() => { if (confirm("Archive this project?")) changeState("ARCHIVED"); }} disabled={stateLoading}
              className="text-[10px] font-bold border border-gray-200 text-gray-500 px-2 py-1 rounded hover:bg-gray-50 transition-colors">
              Archive
            </button>
          )}

          {/* Completion pill */}
          <div className="flex items-center gap-1.5 border border-gray-200 px-2 py-1 rounded">
            <MiniProgress pct={completionPct} color={sectorColor} size={20} />
            <span className="text-[10px] font-bold text-gray-600">{completionPct}%</span>
          </div>

          {/* Global edit toggle */}
          <button
            onClick={() => {
              const next = !globalEdit;
              setGlobalEdit(next);
              setExpandedGroups(p => Object.fromEntries(Object.keys(p).map(k => [k, next])));
            }}
            className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-colors",
              globalEdit ? "border-blue-400 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
            <Pencil className="w-3 h-3" />
            {globalEdit ? "Editing" : "Edit All"}
          </button>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-0 overflow-x-auto flex-shrink-0 h-9">
        {getDetailTabs(project.category.name, project.subcategory.name).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-3 h-full text-[11px] font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
              activeTab === tab ? "text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800")}
            style={activeTab === tab ? { borderColor: sectorColor, color: sectorColor } : undefined}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Body: form + drawer ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Main form area — full width, drawer overlays on top */}
        <div className="flex-1 overflow-y-auto">
          {readOnly && (
            <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              {isArchived ? "This project is archived — read only." : "This project is locked. Unlock to edit."}
            </div>
          )}

          {/* ── PROJECT OVERVIEW ── */}
          {activeTab === "Project Overview" && (
            <div className="p-4 space-y-2">
              {/* Score Analysis Panel */}
              {scoreBreakdown && scoreBreakdown.breakdown.length > 0 && (() => {
                const sb = scoreBreakdown;
                const earned = sb.totalEarned;
                const possible = sb.totalPossible;
                const pct = possible > 0 ? Math.round((Math.max(0, earned) / possible) * 100) : 0;
                const label = pct >= 60 ? "High Potential" : pct >= 30 ? "Medium Potential" : "Low Potential";
                const labelColor = pct >= 60 ? { bg: "#dcfce7", text: "#15803d" } : pct >= 30 ? { bg: "#fef9c3", text: "#a16207" } : { bg: "#fee2e2", text: "#b91c1c" };
                const ringColor = pct >= 60 ? "#16a34a" : pct >= 30 ? "#ca8a04" : "#dc2626";
                return (
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">Opportunity Score Analysis</p>
                          <p className="text-[10px] text-gray-400">Calculated metrics on property feasibility.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: labelColor.bg, color: labelColor.text }}>
                          {label}
                        </span>
                        <div className="relative w-11 h-11 flex-shrink-0">
                          <svg width="44" height="44" className="-rotate-90">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                            <circle cx="22" cy="22" r="18" fill="none" stroke={ringColor} strokeWidth="4"
                              strokeDasharray={`${(pct/100)*113.1} 113.1`} strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: ringColor }}>
                            {earned}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-2 border-b border-gray-50 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: ringColor }} />
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap font-mono">{earned} / {possible} pts</span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {sb.breakdown.map((item, i) => (
                        <div key={i} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs",
                          item.matched ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-gray-100")}>
                          <span className={cn("w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[10px]",
                            item.matched ? "bg-green-200 text-green-700" : "bg-gray-200 text-gray-500")}>
                            {item.matched ? "✓" : "–"}
                          </span>
                          <span className={cn("flex-1 leading-snug", item.matched ? "text-green-800 font-medium" : "text-gray-500")}>
                            {item.name.replace(/\s*–.*$/, "")}
                          </span>
                          <span className={cn("font-bold text-[11px] flex-shrink-0 tabular-nums", item.matched ? "text-green-700" : "text-gray-400")}>
                            {item.score} / {item.maxScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Custom fields — ad-hoc fields discovered after client call */}
              <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <CustomFieldsSection
                  apiBase={`/api/projects/${id}/custom-fields`}
                  readOnly={readOnly}
                />
              </div>

              {project.template.groups.map((tg, gi) => {
                const visibleQs = tg.group.questions.filter(q => isVisible(q));
                const isOpen = !!expandedGroups[tg.id];
                const groupFilled = tg.group.questions.filter(q => localValues[q.id]?.trim()).length;

                // Cycle through a palette of distinct colours — one per group
                const PALETTE = [
                  { dot: "#2563eb", border: "#2563eb", bg: "#eff6ff" }, // blue
                  { dot: "#0d9488", border: "#0d9488", bg: "#f0fdfa" }, // teal
                  { dot: "#7c3aed", border: "#7c3aed", bg: "#f5f3ff" }, // purple
                  { dot: "#d97706", border: "#d97706", bg: "#fffbeb" }, // amber
                  { dot: "#db2777", border: "#db2777", bg: "#fdf2f8" }, // pink
                  { dot: "#059669", border: "#059669", bg: "#ecfdf5" }, // green
                  { dot: "#0891b2", border: "#0891b2", bg: "#f0f9ff" }, // cyan
                  { dot: "#dc2626", border: "#dc2626", bg: "#fff1f2" }, // red
                ];
                const col = PALETTE[gi % PALETTE.length];

                return (
                  <div key={tg.id} className="bg-white rounded-xl overflow-hidden shadow-sm"
                    style={{ border: `1px solid ${col.border}30`, borderLeft: `4px solid ${col.border}` }}>

                    {/* Group header */}
                    <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3"
                      style={{ background: col.bg }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.dot }} />
                        <span className="text-xs font-bold tracking-wider uppercase" style={{ color: col.dot }}>
                          {tg.group.name}
                        </span>
                        {tg.group.isShared && (
                          <span className="text-[9px] bg-white/60 px-1.5 py-0.5 rounded font-medium text-gray-400">shared</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400">{groupFilled}/{tg.group.questions.length} filled</span>
                        <button
                          onClick={() => setExpandedGroups(p => ({ ...p, [tg.id]: !p[tg.id] }))}
                          className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
                          style={{ color: col.dot }}>
                          <span className="w-3.5 h-3.5">✎</span>
                          {isOpen ? "Collapse" : "Modify Values"}
                        </button>
                      </div>
                    </div>

                    {/* Fields — always show summary row, expand to edit */}
                    {isOpen ? (
                      <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 border-t" style={{ borderColor: col.border + "20" }}>
                        {tg.group.questions.map(q => {
                          if (!isVisible(q)) return null;
                          const isWide = q.fieldType === "TEXTAREA" || q.fieldType === "REPEATER";
                          return (
                            <div key={q.id} className={cn(isWide && "col-span-2")}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                {q.label}
                                {q.isRequired && <span className="ml-0.5" style={{ color: col.dot }}>*</span>}
                                {q.isInternal && <span className="ml-1.5 text-[9px] normal-case font-normal bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">admin</span>}
                              </p>
                              <FieldRenderer
                                question={q}
                                value={localValues[q.id] ?? ""}
                                jsonValue={localJsonValues[q.id]}
                                disabled={readOnly}
                                allValues={labelValueMap}
                                onChange={(val, json) => handleChange(q, val, json)}
                              />
                            </div>
                          );
                        })}
                        {visibleQs.length === 0 && (
                          <p className="col-span-2 py-2 text-sm text-gray-400">No visible fields.</p>
                        )}
                      </div>
                    ) : (
                      /* Collapsed read-only summary */
                      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                        {tg.group.questions.slice(0, 6).map(q => {
                          if (!isVisible(q)) return null;
                          const val = localValues[q.id];
                          return (
                            <div key={q.id}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{q.label}</p>
                              <p className="text-sm text-gray-800 mt-0.5 truncate">{val || <span className="text-gray-300">—</span>}</p>
                            </div>
                          );
                        })}
                        {tg.group.questions.length > 6 && (
                          <p className="col-span-2 text-[10px] text-gray-400">+{tg.group.questions.length - 6} more fields…</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── FIND BUYERS / TENANTS ── */}
          {activeTab === "Find Buyers/Tenants" && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-gray-900 text-sm">Find Matching Buyers & Tenants</span>
              </div>
              <p className="text-xs text-gray-400">
                Tick the requirements this property is a good fit for. Save Matches to confirm. Use "Auto-scan" to get score-based suggestions first.
              </p>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <FindRequirementsPanel projectId={id} />
              </div>
            </div>
          )}

          {/* ── OWNERS REGISTER — removed, covered by template questions ── */}
          {false && (() => {
            const units = extraData?.ownerUnits ?? [];
            const total = units.length;
            const agreed = units.filter((u: any) => u.consentStatus === "AGREED").length;
            const conditional = units.filter((u: any) => u.consentStatus === "CONDITIONAL_CONSENT").length;
            const notAgreed = units.filter((u: any) => u.consentStatus === "NOT_AGREED").length;
            const undecided = units.filter((u: any) => u.consentStatus === "UNDECIDED").length;
            const notContacted = units.filter((u: any) => u.consentStatus === "NOT_CONTACTED").length;
            const consentPct = total > 0 ? Math.round((agreed / total) * 100) : 0;
            return (
              <div className="p-4 space-y-3">
                {/* Consent summary */}
                {total > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-900">Consent Summary</p>
                      <span className={cn("text-sm font-bold px-3 py-1 rounded-full", consentPct >= 66 ? "bg-green-100 text-green-700" : consentPct >= 33 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                        {consentPct}% Agreed
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${consentPct}%` }} />
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {[["Agreed", agreed, "text-green-700 bg-green-50"], ["Conditional", conditional, "text-amber-700 bg-amber-50"], ["Undecided", undecided, "text-blue-700 bg-blue-50"], ["Not Agreed", notAgreed, "text-red-700 bg-red-50"], ["Not Contacted", notContacted, "text-gray-500 bg-gray-100"]].map(([label, count, cls]) => (
                        <div key={label as string} className={cn("rounded-lg py-2 px-1", cls as string)}>
                          <p className="text-lg font-bold">{count as number}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-wide leading-tight">{label as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-gray-900 text-sm">Owner Units</span>
                    <span className="text-xs text-gray-400">({total})</span>
                  </div>
                  <button onClick={() => { setAddOwnerForm(true); setEditingOwnerId(null); setOwnerForm(BLANK_OWNER); }}
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">
                    <Plus className="w-3.5 h-3.5" /> Add Unit
                  </button>
                </div>

                {addOwnerForm && (
                  <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700">{editingOwnerId ? "Edit Owner Unit" : "Add Owner Unit"}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Unit # *" value={ownerForm.unitNumber} onChange={e => setOwnerForm(p => ({ ...p, unitNumber: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input placeholder="Owner Name *" value={ownerForm.ownerName} onChange={e => setOwnerForm(p => ({ ...p, ownerName: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input placeholder="Phone" value={ownerForm.phone} onChange={e => setOwnerForm(p => ({ ...p, phone: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input placeholder="Email" type="email" value={ownerForm.email} onChange={e => setOwnerForm(p => ({ ...p, email: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input placeholder="Existing Area (sqft)" type="number" value={ownerForm.existingArea} onChange={e => setOwnerForm(p => ({ ...p, existingArea: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input placeholder="UDS (sqft)" type="number" value={ownerForm.uds} onChange={e => setOwnerForm(p => ({ ...p, uds: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <select value={ownerForm.occupancyStatus} onChange={e => setOwnerForm(p => ({ ...p, occupancyStatus: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        <option value="">Occupancy Status</option>
                        {["Owner Occupied","Tenant Occupied","Vacant","Joint"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={ownerForm.consentStatus} onChange={e => setOwnerForm(p => ({ ...p, consentStatus: e.target.value }))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {["NOT_CONTACTED","AGREED","CONDITIONAL_CONSENT","UNDECIDED","NOT_AGREED"].map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                      </select>
                      <div className="col-span-2">
                        <input placeholder="Owner Conditions / Remarks" value={ownerForm.conditions} onChange={e => setOwnerForm(p => ({ ...p, conditions: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-2">
                        <textarea placeholder="Notes" rows={2} value={ownerForm.notes} onChange={e => setOwnerForm(p => ({ ...p, notes: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                      </div>
                      <label className="col-span-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={ownerForm.meetingAttended} onChange={e => setOwnerForm(p => ({ ...p, meetingAttended: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
                        Meeting attended
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveOwnerUnit} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
                      <button onClick={() => { setAddOwnerForm(false); setEditingOwnerId(null); setOwnerForm(BLANK_OWNER); }} className="border border-gray-200 text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}

                {units.length > 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        {["Unit #","Owner","Phone","Area","UDS","Consent","Meeting",""].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {units.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5 font-mono text-gray-700">{u.unitNumber}</td>
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-gray-900">{u.ownerName}</p>
                              {u.email && <p className="text-[10px] text-gray-400">{u.email}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500">{u.phone ?? "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600">{u.existingArea ? `${u.existingArea} sqft` : "—"}</td>
                            <td className="px-3 py-2.5 text-gray-600">{u.uds ? `${u.uds} sqft` : "—"}</td>
                            <td className="px-3 py-2.5">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", consentColors[u.consentStatus] ?? "bg-gray-100 text-gray-500")}>
                                {u.consentStatus.replace(/_/g," ")}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {u.meetingAttended ? <span className="text-green-600 font-bold text-[10px]">✓</span> : <span className="text-gray-300 text-[10px]">—</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEditOwner(u)} className="text-[10px] text-blue-600 font-bold hover:underline">Edit</button>
                                <span className="text-gray-200">|</span>
                                <button onClick={() => deleteOwnerUnit(u.id)} className="text-[10px] text-red-500 font-bold hover:underline">Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : !addOwnerForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No owner units registered yet.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── LEGAL — removed, covered by template questions ── */}

          {/* ── NEGOTIATION LOG ── */}
          {activeTab === "Negotiation Log" && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Handshake className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-gray-900 text-sm">Negotiation History</span>
                <span className="text-xs text-gray-400">({extraData?.negotiations.length ?? 0})</span>
              </div>
              {extraData && extraData.negotiations.length > 0 ? extraData.negotiations.map((n: any) => (
                <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">with {n.contact.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      n.status==="AGREED"?"bg-green-50 text-green-700":n.status==="ACTIVE"?"bg-blue-50 text-blue-700":"bg-gray-100 text-gray-500")}>
                      {n.status}
                    </span>
                  </div>
                  {n.rounds.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 space-y-2 mb-3">
                      {n.rounds.map((r: any, i: number) => (
                        <div key={r.id} className="flex items-start gap-3 text-xs">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">{i+1}</span>
                          <div>
                            <span className={cn("font-semibold", r.offerBy==="buyer"?"text-blue-700":"text-amber-700")}>
                              {r.offerBy==="buyer"?"Buyer":"Seller"}: ₹{r.offerAmount?(r.offerAmount/1e7).toFixed(2)+"Cr":"—"}
                            </span>
                            {r.notes && <p className="text-gray-400 mt-0.5">{r.notes}</p>}
                          </div>
                          <span className="ml-auto text-gray-400">{new Date(r.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add round form */}
                  {addRoundNegId === n.id && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={roundForm.offerBy} onChange={e => setRoundForm(p => ({ ...p, offerBy: e.target.value }))}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="buyer">Buyer offer</option>
                          <option value="seller">Seller offer</option>
                        </select>
                        <input placeholder="Amount (₹)" type="number" value={roundForm.offerAmount}
                          onChange={e => setRoundForm(p => ({ ...p, offerAmount: e.target.value }))}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <input placeholder="Notes (optional)" value={roundForm.notes}
                        onChange={e => setRoundForm(p => ({ ...p, notes: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <div className="flex gap-2">
                        <button onClick={() => addNegotiationRound(n.id, n.rounds.length + 1)}
                          className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">Save Round</button>
                        <button onClick={() => { setAddRoundNegId(null); setRoundForm(BLANK_ROUND); }}
                          className="border border-gray-200 text-[10px] text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Close deal form */}
                  {closeDealNegId === n.id && (
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={dealForm.dealType} onChange={e => setDealForm(p => ({ ...p, dealType: e.target.value }))}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {["SOLD","RENTED","LEASED","REDEVELOPMENT_CONFIRMED","WITHDRAWN","REQUIREMENT_CLOSED"].map(t => (
                            <option key={t} value={t}>{t.replace(/_/g," ")}</option>
                          ))}
                        </select>
                        <input type="date" value={dealForm.closureDate}
                          onChange={e => setDealForm(p => ({ ...p, closureDate: e.target.value }))}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input placeholder="Final Price (₹)" type="number" value={dealForm.finalPrice}
                          onChange={e => setDealForm(p => ({ ...p, finalPrice: e.target.value }))}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input placeholder="Final Rent (₹/mo)" type="number" value={dealForm.finalRent}
                          onChange={e => setDealForm(p => ({ ...p, finalRent: e.target.value }))}
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <input placeholder="Notes (optional)" value={dealForm.notes}
                        onChange={e => setDealForm(p => ({ ...p, notes: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <div className="flex gap-2">
                        <button onClick={() => closeDeal(n.contact.id)}
                          className="bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-green-700">Confirm Deal Closed</button>
                        <button onClick={() => { setCloseDealNegId(null); setDealForm(BLANK_DEAL); }}
                          className="border border-gray-200 text-[10px] text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {addRoundNegId !== n.id && closeDealNegId !== n.id && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                      {n.status === "ACTIVE" && project?.state !== "ARCHIVED" && (
                        <>
                          <button onClick={() => { setAddRoundNegId(n.id); setRoundForm(BLANK_ROUND); }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100">
                            + Add Round
                          </button>
                          <button onClick={() => updateNegotiationStatus(n.id, "AGREED")}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100">
                            Mark Agreed
                          </button>
                          <button onClick={() => updateNegotiationStatus(n.id, "COLLAPSED")}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                            Mark Collapsed
                          </button>
                        </>
                      )}
                      {n.status === "AGREED" && project?.state !== "ARCHIVED" && (
                        <button onClick={() => { setCloseDealNegId(n.id); setDealForm(BLANK_DEAL); }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700">
                          ✓ Close Deal
                        </button>
                      )}
                      {project?.state === "ARCHIVED" && (
                        <span className="text-[10px] font-bold text-gray-400">Deal closed — property archived.</span>
                      )}
                      {n.status === "COLLAPSED" && project?.state !== "ARCHIVED" && (
                        <span className="text-[10px] text-gray-400">Negotiation collapsed.</span>
                      )}
                    </div>
                  )}
                </div>
              )) : (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <Handshake className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No negotiations for this property yet.</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Once a proposal is accepted, a negotiation is created here. Track offer rounds until a deal is closed.
                  </p>
                  <p className="text-xs text-blue-600 font-medium mt-2">
                    Go to Proposals → accept a proposal to start a negotiation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── DEVELOPERS & PROPOSALS ── */}
          {activeTab === "Developers & Proposals" && (() => {
            const devProposals = extraData?.developerProposals ?? [];
            const availableDevs = extraData?.developers ?? [];
            const DEV_STATUS_COLORS: Record<string, string> = {
              NOT_CONTACTED: "bg-gray-100 text-gray-500", PROJECT_SENT: "bg-blue-50 text-blue-600",
              RESPONSE_PENDING: "bg-amber-50 text-amber-600", INTERESTED: "bg-teal-50 text-teal-600",
              NOT_INTERESTED: "bg-red-50 text-red-500", MEETING_SCHEDULED: "bg-purple-50 text-purple-600",
              PROPOSAL_REQUESTED: "bg-indigo-50 text-indigo-600", PROPOSAL_RECEIVED: "bg-cyan-50 text-cyan-700",
              REVISION_REQUESTED: "bg-orange-50 text-orange-600", SHORTLISTED: "bg-yellow-50 text-yellow-700",
              FINAL_NEGOTIATION: "bg-pink-50 text-pink-700", SELECTED: "bg-green-100 text-green-700",
              REJECTED: "bg-red-100 text-red-700", NOT_SELECTED: "bg-gray-100 text-gray-400",
            };
            // Quick-action status progressions
            const NEXT_STATUS: Record<string, string> = {
              NOT_CONTACTED: "PROJECT_SENT", PROJECT_SENT: "RESPONSE_PENDING",
              RESPONSE_PENDING: "INTERESTED", INTERESTED: "MEETING_SCHEDULED",
              MEETING_SCHEDULED: "PROPOSAL_REQUESTED", PROPOSAL_REQUESTED: "PROPOSAL_RECEIVED",
              PROPOSAL_RECEIVED: "SHORTLISTED", SHORTLISTED: "FINAL_NEGOTIATION",
              FINAL_NEGOTIATION: "SELECTED",
            };
            return (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-gray-900 text-sm">Developer Proposals</span>
                    <span className="text-xs text-gray-400">({devProposals.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {devProposals.length > 1 && (
                      <button onClick={() => setDevCompareMode(v => !v)}
                        className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors",
                          devCompareMode ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500 hover:bg-gray-50")}>
                        {devCompareMode ? "Card View" : "Compare All"}
                      </button>
                    )}
                    <button onClick={() => { setAddDevForm(true); setEditingDevId(null); setDevForm(BLANK_DEV); }}
                      className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-purple-700">
                      <Plus className="w-3.5 h-3.5" /> Add Developer
                    </button>
                  </div>
                </div>

                {/* ── Comparison table ── */}
                {devCompareMode && devProposals.length > 0 && (
                  <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[640px]">
                        <thead>
                          <tr className="bg-purple-50 border-b border-purple-100 sticky top-0 z-10">
                            <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-purple-500 w-28">Term</th>
                            {devProposals.map((dp: any) => (
                              <th key={dp.id} className="text-center px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-gray-600">
                                <p className="font-bold text-gray-900 normal-case text-xs truncate max-w-[120px]">{dp.developer.contact.name}</p>
                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", DEV_STATUS_COLORS[dp.status] ?? "bg-gray-100 text-gray-500")}>
                                  {dp.status.replace(/_/g," ")}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {([
                            ["Add. Area (sqft)", (dp: any) => dp.additionalArea ? `${dp.additionalArea}` : "—"],
                            ["Corpus Fund", (dp: any) => dp.corpusFund ? `₹${(dp.corpusFund/1e5).toFixed(1)}L` : "—"],
                            ["Monthly Rent", (dp: any) => dp.monthlyRent ? `₹${dp.monthlyRent.toLocaleString()}` : "—"],
                            ["Deposit", (dp: any) => dp.deposit ? `₹${(dp.deposit/1e5).toFixed(1)}L` : "—"],
                            ["Construction (mo)", (dp: any) => dp.constructionTimeline ? `${dp.constructionTimeline}` : "—"],
                            ["Grace Period (mo)", (dp: any) => dp.gracePeriod ? `${dp.gracePeriod}` : "—"],
                            ["Bank Guarantee", (dp: any) => dp.bankGuarantee || "—"],
                            ["Parking Slots", (dp: any) => dp.parking ? `${dp.parking}` : "—"],
                            ["Amenities", (dp: any) => dp.amenities || "—"],
                          ] as [string, (dp: any) => string][]).map(([label, fn]) => (
                            <tr key={label} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-semibold text-gray-500 text-[10px] uppercase tracking-wider whitespace-nowrap">{label}</td>
                              {devProposals.map((dp: any) => (
                                <td key={dp.id} className={cn("px-3 py-2 text-center font-medium", dp.status === "SELECTED" ? "text-green-700 bg-green-50/50" : "text-gray-800")}>
                                  {fn(dp)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {addDevForm && (
                  <div className="bg-white rounded-xl border border-purple-200 p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700">{editingDevId ? "Edit Proposal" : "Add Developer Proposal"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Developer *</label>
                        <select value={devForm.developerId} onChange={e => setDevForm(p => ({ ...p, developerId: e.target.value }))}
                          className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white">
                          <option value="">Select developer…</option>
                          {availableDevs.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.contact.name}{d.reraNumber ? ` (${d.reraNumber})` : ""}</option>
                          ))}
                        </select>
                        {availableDevs.length === 0 && (
                          <p className="text-[10px] text-amber-600 mt-1">No developers in system yet. Add a contact with type DEVELOPER first, then it will appear here.</p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                        <select value={devForm.status} onChange={e => setDevForm(p => ({ ...p, status: e.target.value }))}
                          className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white">
                          {Object.keys(DEV_STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Additional Area (sqft)</label>
                        <input type="number" value={devForm.additionalArea} onChange={e => setDevForm(p => ({ ...p, additionalArea: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Corpus Fund (₹)</label>
                        <input type="number" value={devForm.corpusFund} onChange={e => setDevForm(p => ({ ...p, corpusFund: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Monthly Rent (₹)</label>
                        <input type="number" value={devForm.monthlyRent} onChange={e => setDevForm(p => ({ ...p, monthlyRent: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Deposit (₹)</label>
                        <input type="number" value={devForm.deposit} onChange={e => setDevForm(p => ({ ...p, deposit: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Construction Timeline (months)</label>
                        <input type="number" value={devForm.constructionTimeline} onChange={e => setDevForm(p => ({ ...p, constructionTimeline: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Grace Period (months)</label>
                        <input type="number" value={devForm.gracePeriod} onChange={e => setDevForm(p => ({ ...p, gracePeriod: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Bank Guarantee</label>
                        <input value={devForm.bankGuarantee} onChange={e => setDevForm(p => ({ ...p, bankGuarantee: e.target.value }))} placeholder="e.g. 6 months rent" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Parking Slots</label>
                        <input type="number" value={devForm.parking} onChange={e => setDevForm(p => ({ ...p, parking: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Amenities Offered</label>
                        <input value={devForm.amenities} onChange={e => setDevForm(p => ({ ...p, amenities: e.target.value }))} placeholder="e.g. Club house, gym, swimming pool" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Internal Remarks</label>
                        <textarea rows={2} value={devForm.internalRemarks} onChange={e => setDevForm(p => ({ ...p, internalRemarks: e.target.value }))} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveDevProposal} className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-700">Save</button>
                      <button onClick={() => { setAddDevForm(false); setEditingDevId(null); setDevForm(BLANK_DEV); }} className="border border-gray-200 text-xs text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}

                {devProposals.length > 0 ? (
                  <div className="space-y-2">
                    {devProposals.map((dp: any) => (
                      <div key={dp.id} className={cn("bg-white rounded-xl border p-4 space-y-3", dp.status === "SELECTED" ? "border-green-300 bg-green-50/30" : "border-gray-200")}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{dp.developer.contact.name}</p>
                            {dp.developer.reraNumber && <p className="text-[10px] text-gray-400 font-mono mt-0.5">RERA: {dp.developer.reraNumber}</p>}
                          </div>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0", DEV_STATUS_COLORS[dp.status] ?? "bg-gray-100 text-gray-500")}>
                            {dp.status.replace(/_/g," ")}
                          </span>
                        </div>

                        {/* Terms grid */}
                        {(dp.additionalArea || dp.corpusFund || dp.monthlyRent || dp.constructionTimeline) && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-gray-50 rounded-lg p-3">
                            {dp.additionalArea && <div><p className="text-xs font-bold text-gray-900">{dp.additionalArea} sqft</p><p className="text-[9px] text-gray-400 uppercase tracking-wider">Add. Area</p></div>}
                            {dp.corpusFund && <div><p className="text-xs font-bold text-gray-900">₹{(dp.corpusFund/1e5).toFixed(1)}L</p><p className="text-[9px] text-gray-400 uppercase tracking-wider">Corpus</p></div>}
                            {dp.monthlyRent && <div><p className="text-xs font-bold text-gray-900">₹{dp.monthlyRent.toLocaleString()}</p><p className="text-[9px] text-gray-400 uppercase tracking-wider">Rent/mo</p></div>}
                            {dp.constructionTimeline && <div><p className="text-xs font-bold text-gray-900">{dp.constructionTimeline} mo</p><p className="text-[9px] text-gray-400 uppercase tracking-wider">Timeline</p></div>}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                          {NEXT_STATUS[dp.status] && (
                            <button onClick={() => updateDevStatus(dp.id, NEXT_STATUS[dp.status])}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                              → {NEXT_STATUS[dp.status].replace(/_/g," ")}
                            </button>
                          )}
                          {!["SELECTED","REJECTED","NOT_SELECTED"].includes(dp.status) && (
                            <>
                              <button onClick={() => updateDevStatus(dp.id, "SHORTLISTED")}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                                Shortlist
                              </button>
                              <button onClick={() => updateDevStatus(dp.id, "REJECTED")}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                                Reject
                              </button>
                            </>
                          )}
                          {dp.status === "SHORTLISTED" && (
                            <button onClick={() => updateDevStatus(dp.id, "SELECTED")}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700">
                              ✓ Select Developer
                            </button>
                          )}
                          {["PROPOSAL_RECEIVED","SHORTLISTED","FINAL_NEGOTIATION","SELECTED"].includes(dp.status) && (
                            <button onClick={() => startNegotiationWithDev(dp.developer.contactId)}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">
                              Negotiate
                            </button>
                          )}
                          <button onClick={() => startEditDev(dp)}
                            className="ml-auto text-[10px] text-blue-600 font-bold hover:underline">Edit</button>
                          <button onClick={() => deleteDevProposal(dp.id)}
                            className="text-[10px] text-red-500 font-bold hover:underline">Remove</button>
                        </div>
                        {dp.internalRemarks && (
                          <p className="text-[10px] text-gray-400 italic border-t border-gray-100 pt-2">{dp.internalRemarks}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !addDevForm && (
                  <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                    <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No developer proposals yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Add Developer" to begin outreach tracking.</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── MEETINGS ── */}
          {activeTab === "Meetings" && (
            <MeetingsTab projectId={id} />
          )}

          {/* ── TIMELINE ── */}
          {activeTab === "Timeline" && (
            <TimelineTab projectId={id} />
          )}

          {/* ── FILES ── */}
          {activeTab === "Files" && (
            <div className="p-4">
              <FilesTab projectId={id} readOnly={readOnly} />
            </div>
          )}

          {/* ── NOTES ── */}
          {activeTab === "Notes" && (
            <div className="p-4">
              <NotesTab projectId={id} />
            </div>
          )}

          {/* ── TASKS ── */}
          {activeTab === "Tasks" && (
            <div className="p-4">
              <FollowUpsTab projectId={id} />
            </div>
          )}

          {/* ── AUDIT ── */}
          {activeTab === "Audit" && (
            <div className="p-4">
              <AuditTab projectId={id} />
            </div>
          )}

          {/* ── CLOSURE ── */}
          {activeTab === "Closure" && (
            <ClosureTab projectId={id} readOnly={readOnly} />
          )}
        </div>
      </div>

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" />Saving…</>}
          {saveStatus === "saved"  && <><Check className="w-3 h-3 text-green-500" />Draft saved</>}
          {saveStatus === "error"  && <><AlertCircle className="w-3 h-3 text-red-500" />Save failed</>}
          {saveStatus === "idle"   && "Draft saved"}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1 border border-gray-200 text-gray-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-3 h-3" /> Print
          </button>
          <a href={`/api/projects/${id}/export`} download
            className="flex items-center gap-1 border border-gray-200 text-gray-600 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-3 h-3" /> Export PDF
          </a>
          <button onClick={() => router.back()}
            className="border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => router.back()}
            disabled={readOnly || saveStatus === "saving"}
            className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            Save &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
