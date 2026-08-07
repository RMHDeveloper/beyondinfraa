import { db } from "@/lib/db";
import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   "bg-blue-50 text-blue-700",
  COMPLETED:   "bg-green-50 text-green-700",
  CANCELLED:   "bg-red-50 text-red-700",
  RESCHEDULED: "bg-amber-50 text-amber-700",
};

export default async function SiteVisitsPage() {
  const visits = await db.siteVisit.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      contact: { select: { id: true, name: true } },
      project: { select: { id: true, title: true, projectNumber: true } },
    },
  });

  const scheduled  = visits.filter((v) => v.status === "SCHEDULED").length;
  const completed  = visits.filter((v) => v.status === "COMPLETED").length;
  const cancelled  = visits.filter((v) => v.status === "CANCELLED").length;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">ERP System › Site Visits</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Site Visits</h1>
        </div>
        <Link href="/site-visits/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Schedule Visit
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Scheduled", value: scheduled, color: "#2563eb", bg: "#eff6ff" },
            { label: "Completed", value: completed, color: "#059669", bg: "#ecfdf5" },
            { label: "Cancelled", value: cancelled, color: "#dc2626", bg: "#fef2f2" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {visits.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-500">No site visits yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Schedule a visit to show a property to a buyer or tenant. You can also schedule from a Proposal.
            </p>
            <Link href="/site-visits/new"
              className="inline-block mt-4 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700">
              Schedule First Visit →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  {["Visit #", "Property", "Contact", "Scheduled", "Location", "Notes", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visits.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{v.visitNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/projects/${v.project.id}`} className="font-semibold text-gray-900 hover:text-blue-600 block">{v.project.title}</Link>
                      <p className="text-[10px] text-gray-400 font-mono">{v.project.projectNumber}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{v.contact.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(v.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{v.location ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">{v.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", STATUS_COLORS[v.status] ?? "bg-gray-100 text-gray-500")}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {visits.length > 0 && (
          <p className="text-xs text-gray-400 text-right">
            {visits.length} total · after a visit, go to the Property → update the Proposal status to Viewed or Accepted.
          </p>
        )}
      </div>
    </div>
  );
}
