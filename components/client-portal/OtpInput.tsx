"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

export default function OtpInput({ value, onChange, length = 6, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setDigit(i: number, d: string) {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, length));
  }

  function handleChange(i: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d) { setDigit(i, ""); return; }
    setDigit(i, d[d.length - 1]);
    if (i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            "w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-xl border-2 border-gray-200 text-gray-900",
            "focus:outline-none focus:ring-2 focus:ring-[#0d2137]/20 focus:border-[#0d2137] transition-colors",
            "disabled:bg-gray-50 disabled:text-gray-400"
          )}
        />
      ))}
    </div>
  );
}
