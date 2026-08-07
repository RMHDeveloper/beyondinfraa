"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Target, CheckCircle2, Loader2 } from "lucide-react";

export default function RunMatchingPage() {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<{ created: number } | null>(null);

  async function run() {
    setState("running");
    try {
      const res = await fetch("/api/matching/run", { method: "POST" });
      const data = await res.json();
      if (data.ok) { setResult(data); setState("done"); }
      else setState("error");
    } catch { setState("error"); }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/projects?tab=Matching" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">ERP System › Matching Engine</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Run Matching Engine</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-8 max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
            {state === "running" ? (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            ) : state === "done" ? (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            ) : (
              <Target className="w-8 h-8 text-blue-600" />
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {state === "idle"    && "Bidirectional Matching"}
              {state === "running" && "Running…"}
              {state === "done"    && "Matching Complete"}
              {state === "error"   && "Error"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {state === "idle"    && "Compares all active requirements against available properties using budget, area, furnishing, and BHK criteria."}
              {state === "running" && "Scoring requirements against all available properties. This may take a moment…"}
              {state === "done"    && `Created ${result?.created} new match${result?.created === 1 ? "" : "es"}. Existing matches were skipped.`}
              {state === "error"   && "Something went wrong. Please try again."}
            </p>
          </div>

          {(state === "idle" || state === "error") && (
            <button onClick={run}
              className="bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Run Now
            </button>
          )}

          {state === "done" && (
            <Link href="/projects?tab=Matching"
              className="inline-block bg-green-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors">
              View Match Results →
            </Link>
          )}
        </div>

        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">How It Works</p>
          <div className="space-y-2.5">
            {[
              { step: "1", text: "Loads all active Buyer & Tenant requirements" },
              { step: "2", text: "Loads all available properties" },
              { step: "3", text: "Scores each pair: Category → Budget/Rent → Area → BHK → Furnishing" },
              { step: "4", text: "Saves match% + criteria matched/missed for each pair" },
              { step: "5", text: "Skips pairs that already have a match record" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{step}</span>
                <p className="text-xs text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
