"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  isInternal: boolean;
  options: string[];
  unit: string | null;
  helpText: string | null;
  conditionalJson: { parentLabel: string; matchValue: string } | null;
  autoCalcJson: { formula: string; sourceField: string } | null;
};

type Props = {
  question: Question;
  value: string;
  jsonValue: unknown;
  onChange: (value: string | null, jsonValue?: unknown) => void;
  disabled?: boolean;
  allValues: Record<string, string>; // questionLabel -> value, for conditional + auto-calc
};

export default function FieldRenderer({ question, value, jsonValue, onChange, disabled, allValues }: Props) {
  const [localValue, setLocalValue] = useState(value ?? "");

  useEffect(() => { setLocalValue(value ?? ""); }, [value]);

  // Auto-calc
  useEffect(() => {
    if (!question.autoCalcJson || question.autoCalcJson.formula === "scoring") return;
    const sourceVal = parseFloat(allValues[question.autoCalcJson.sourceField] ?? "0");
    if (isNaN(sourceVal)) return;

    let result: number | null = null;
    if (question.autoCalcJson.formula.includes("/ 2400")) result = sourceVal / 2400;
    else if (question.autoCalcJson.formula.includes("/ 43560")) result = sourceVal / 43560;
    else if (question.autoCalcJson.formula.includes("/ 435.6")) result = sourceVal / 435.6;

    if (result !== null) {
      const formatted = result.toFixed(3);
      if (formatted !== localValue) {
        setLocalValue(formatted);
        onChange(formatted);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allValues, question.autoCalcJson]);

  const isAutoCalc = !!question.autoCalcJson && question.autoCalcJson.formula !== "scoring";
  const effectiveDisabled = disabled || isAutoCalc;

  const baseInput = "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500";

  switch (question.fieldType) {
    case "TEXT":
    case "PHONE":
    case "EMAIL":
      return (
        <input
          type={question.fieldType === "EMAIL" ? "email" : question.fieldType === "PHONE" ? "tel" : "text"}
          value={localValue}
          disabled={effectiveDisabled}
          onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }}
          placeholder={question.helpText ?? undefined}
          className={baseInput}
        />
      );

    case "TEXTAREA":
      return (
        <textarea
          value={localValue}
          disabled={effectiveDisabled}
          onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }}
          rows={3}
          placeholder={question.helpText ?? undefined}
          className={cn(baseInput, "resize-none")}
        />
      );

    case "NUMBER":
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={localValue}
            disabled={effectiveDisabled}
            onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }}
            className={cn(baseInput, "flex-1")}
          />
          {question.unit && <span className="text-sm text-gray-400 whitespace-nowrap">{question.unit}</span>}
          {isAutoCalc && <span className="text-xs text-purple-500 whitespace-nowrap">auto</span>}
        </div>
      );

    case "DATE":
      return (
        <input
          type="date"
          value={localValue}
          disabled={effectiveDisabled}
          onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }}
          className={baseInput}
        />
      );

    case "RADIO":
      return (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={effectiveDisabled}
              onClick={() => { if (!effectiveDisabled) onChange(opt); }}
              className={cn(
                "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors",
                value === opt
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-700 hover:border-gray-400",
                effectiveDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    case "DROPDOWN":
      return (
        <select
          value={localValue}
          disabled={effectiveDisabled}
          onChange={(e) => { setLocalValue(e.target.value); onChange(e.target.value); }}
          className={cn(baseInput, "bg-white")}
        >
          <option value="">Select…</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "MULTISELECT": {
      const selected: string[] = Array.isArray(jsonValue) ? (jsonValue as string[]) : [];
      return (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={effectiveDisabled}
                onClick={() => {
                  if (effectiveDisabled) return;
                  const next = active ? selected.filter((s) => s !== opt) : [...selected, opt];
                  onChange(next.join(", "), next);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                  active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400",
                  effectiveDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    case "REPEATER": {
      const rows: Record<string, string>[] = Array.isArray(jsonValue) ? (jsonValue as Record<string, string>[]) : [];
      const cols = question.helpText
        ? question.helpText.split("/").map((s) => s.trim())
        : ["Value"];

      function updateRows(next: Record<string, string>[]) {
        onChange(JSON.stringify(next), next);
      }

      return (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              {cols.map((col) => (
                <input
                  key={col}
                  disabled={effectiveDisabled}
                  value={row[col] ?? ""}
                  placeholder={col}
                  onChange={(e) => {
                    const next = rows.map((r, ri) => ri === i ? { ...r, [col]: e.target.value } : r);
                    updateRows(next);
                  }}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              ))}
              {!effectiveDisabled && (
                <>
                  <button type="button" title="Duplicate row"
                    onClick={() => updateRows([...rows.slice(0, i + 1), { ...row }, ...rows.slice(i + 1)])}
                    className="text-gray-300 hover:text-gray-700">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button type="button" title="Delete row"
                    onClick={() => updateRows(rows.filter((_, ri) => ri !== i))} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
          {!effectiveDisabled && (
            <button
              onClick={() => updateRows([...rows, Object.fromEntries(cols.map((c) => [c, ""]))])}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add row
            </button>
          )}
        </div>
      );
    }

    case "FILE": {
      const fileRef = { current: null as HTMLInputElement | null };
      return (
        <div>
          <input
            type="file"
            ref={(el) => { fileRef.current = el; }}
            className="hidden"
            disabled={effectiveDisabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange(f.name);
            }}
          />
          <button
            type="button"
            disabled={effectiveDisabled}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 text-sm border border-gray-300 text-gray-700 px-3.5 py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {value ? `📎 ${value}` : "Choose file…"}
          </button>
          {value && <p className="text-xs text-gray-400 mt-1">Use Files tab to manage uploads.</p>}
        </div>
      );
    }

    default:
      return null;
  }
}
