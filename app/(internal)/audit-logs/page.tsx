export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { format } from "date-fns";

export default async function AuditLogsPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Audit Logs</h1>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wide">Time</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wide">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wide">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-gray-400 whitespace-nowrap">
                  {format(new Date(l.createdAt), "dd MMM HH:mm:ss")}
                </td>
                <td className="px-4 py-2.5 text-gray-700">{l.user?.name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{l.action}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {l.entityType} {l.entityId ? <span className="font-mono text-gray-400">{l.entityId.slice(-6)}</span> : ""}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No audit logs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
