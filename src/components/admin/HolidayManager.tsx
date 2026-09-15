"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Holiday, Office } from "@/lib/store/types";

export function HolidayManager({
  holidays,
  offices,
  onAdd,
  onRemove,
}: {
  holidays: Holiday[];
  offices: Office[];
  onAdd: (input: { office_id: string; holiday_date: string; label: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [officeId, setOfficeId] = useState(offices[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holidaysByOffice = useMemo(() => {
    const map: Record<string, Holiday[]> = {};
    for (const h of holidays) {
      (map[h.office_id] ??= []).push(h);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
    }
    return map;
  }, [holidays]);

  async function submit() {
    if (!officeId) {
      setError("Choose an office");
      return;
    }
    if (!date) {
      setError("Pick a date");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd({ office_id: officeId, holiday_date: date, label });
      setDate("");
      setLabel("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Office Holidays</h2>
      <p className="mb-4 text-xs text-slate-400">
        Holidays are set per office. Each employee&apos;s tracker automatically shows the holidays
        for their assigned office (purple), based on the office mapping above — no per-employee
        setup needed. Weekends are excluded and highlighted separately regardless of office.
      </p>
      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
        <label className="text-xs font-medium text-slate-600">
          Office
          <select
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            className="mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Diwali"
            className="mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </label>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Add holiday
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-4">
        {offices.map((o) => (
          <div key={o.id}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {o.name} ({(holidaysByOffice[o.id] ?? []).length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {(holidaysByOffice[o.id] ?? []).map((h) => (
                <span
                  key={h.id}
                  className="flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800"
                >
                  {h.holiday_date} · {h.label}
                  <button
                    onClick={() => onRemove(h.id)}
                    className="text-purple-600 hover:text-purple-900"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
              {(holidaysByOffice[o.id] ?? []).length === 0 && (
                <p className="text-sm text-slate-400">No holidays added yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
