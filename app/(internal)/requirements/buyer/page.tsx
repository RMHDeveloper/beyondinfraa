import { db } from "@/lib/db";
import Link from "next/link";
import { Users, Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  NEW:     "bg-blue-50 text-blue-700",
  ACTIVE:  "bg-green-50 text-green-700",
  CLOSED:  "bg-gray-100 text-gray-500",
  ON_HOLD: "bg-amber-50 text-amber-700",
};

export default async function BuyerRequirementsPage() {
  const reqs = await db.buyerRequirement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      contact: { select: { id: true, name: true } },
      category: { select: { name: true } },
      matches: { where: { confirmedAt: { not: null } }, select: { id: true } },
    },
    take: 200,
  });

  const active   = reqs.filter(r => r.status === "ACTIVE" || r.status === "NEW");
  const inactive = reqs.filter(r => r.status !== "ACTIVE" && r.status !== "NEW");

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP › Requirements</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" /> Buyer Requirements
          </h1>
        </div>
        <Link href="/requirements/buyer/new"
          className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-green-700">
          <Plus className="w-3.5 h-3.5" /> Add Requirement
        </Link>
      </div>

      <div className="px-6 py-5 space-y-6">
        {reqs.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No buyer requirements yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Add a buyer's requirements to start matching them with properties.</p>
            <Link href="/requirements/buyer/new"
              className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-700">
              <Plus className="w-3.5 h-3.5" /> Add First Requirement
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-3">Active ({active.length})</p>
            <div className="space-y-2">
              {active.map(r => <ReqRow key={r.id} r={r} />)}
            </div>
          </section>
        )}

        {inactive.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Closed / On Hold ({inactive.length})</p>
            <div className="space-y-2">
              {inactive.map(r => <ReqRow key={r.id} r={r} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ReqRow({ r }: {
  r: {
    id: string; reqNumber: string; status: string;
    budgetMin: number | null; budgetMax: number | null;
    areaMin: number | null; areaMax: number | null;
    bhk: string | null;
    contact: { id: string; name: string };
    category: { name: string };
    matches: { id: string }[];
  }
}) {
  return (
    <Link href={`/requirements/buyer/${r.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-green-300 hover:bg-green-50/30 transition-all group">
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-green-700">
        {r.contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-900 text-sm">{r.contact.name}</span>
          <span className="font-mono text-[10px] text-gray-400">{r.reqNumber}</span>
          <span className="text-[10px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{r.category.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {r.budgetMin && r.budgetMax && (
            <span className="text-[10px] text-gray-500">₹{(r.budgetMin/1e7).toFixed(1)}–{(r.budgetMax/1e7).toFixed(1)}Cr</span>
          )}
          {r.areaMin && r.areaMax && (
            <span className="text-[10px] text-gray-500">{r.areaMin}–{r.areaMax} sqft</span>
          )}
          {r.bhk && <span className="text-[10px] text-gray-500">{r.bhk}</span>}
          {r.matches.length > 0 && (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
              {r.matches.length} matched
            </span>
          )}
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
        {r.status.replace(/_/g, " ")}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
    </Link>
  );
}
