"use client";

import { useCallback, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosave(projectId: string, endpoint?: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const save = useCallback(
    async (questionId: string, value: string | null, jsonValue?: unknown) => {
      if (!projectId) return;
      setStatus("saving");
      const url = endpoint ?? `/api/projects/${projectId}/responses`;
      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, value, jsonValue }),
        });
        if (!res.ok) throw new Error("save failed");
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    },
    [projectId, endpoint]
  );

  // Debounced save for text inputs (1200ms)
  const debouncedSave = useCallback(
    (questionId: string, value: string) => {
      const existing = timers.current.get(questionId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        save(questionId, value);
        timers.current.delete(questionId);
      }, 1200);
      timers.current.set(questionId, t);
    },
    [save]
  );

  // Immediate save for radio, dropdown, multiselect, repeater
  const immediateSave = useCallback(
    (questionId: string, value: string | null, jsonValue?: unknown) => {
      save(questionId, value, jsonValue);
    },
    [save]
  );

  return { status, debouncedSave, immediateSave };
}
