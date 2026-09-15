"use client";

import { useState } from "react";
import type { OrgSettings } from "@/lib/store/types";

export function ReminderSettings({
  settings,
  onSave,
}: {
  settings: OrgSettings;
  onSave: (days: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(settings.stale_task_reminder_days));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    const days = Number(value);
    if (!Number.isFinite(days) || days < 1) {
      setError("Enter a whole number of days (1 or more)");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onSave(days);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Stale Task Reminders</h2>
      <p className="mb-4 text-xs text-slate-400">
        If a task&apos;s status hasn&apos;t changed in this many days (and it isn&apos;t Done),
        both the task owner and all managers get a reminder notification — repeating every this
        many days until the status changes.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
        <span className="text-sm text-slate-500">days</span>
        <button
          onClick={save}
          disabled={saving}
          className="ml-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
