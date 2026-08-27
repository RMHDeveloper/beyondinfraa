"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

type SentToItem = {
  id: string;
  response: string;
  createdAt: string;
  proposal: {
    id: string;
    proposalNumber: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
    contact: { id: string; name: string; type: string };
  };
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  SENT: "bg-blue-50 text-blue-700",
  VIEWED: "bg-cyan-50 text-cyan-700",
  RESPONSE_PENDING: "bg-amber-50 text-amber-700",
  INTERESTED: "bg-green-50 text-green-700",
  PARTIALLY_SHORTLISTED: "bg-green-50 text-green-700",
  SITE_VISIT_REQUESTED: "bg-purple-50 text-purple-700",
  NEGOTIATING: "bg-purple-50 text-purple-700",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-50 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-400",
};

export default function SentToPanel({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<SentToItem[] | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/proposals`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, [projectId]);

  if (items === null) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Send className="w-4 h-4 text-blue-600" />
        <span className="font-bold text-gray-900 text-sm">Sent To</span>
        <span className="text-xs text-gray-400">({items.length})</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">Every proposal this property has been included in.</p>

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Not included in any proposal yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/proposals/${item.proposal.id}`}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.proposal.contact.name}</p>
                <p className="text-xs text-gray-400">
                  {item.proposal.proposalNumber} ·{" "}
                  {item.proposal.sentAt
                    ? `Sent ${new Date(item.proposal.sentAt).toLocaleDateString()}`
                    : `Created ${new Date(item.proposal.createdAt).toLocaleDateString()}`}
                </p>
              </div>
              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0", STATUS_STYLES[item.proposal.status] ?? "bg-gray-100 text-gray-500")}>
                {item.proposal.status.replace(/_/g, " ")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
