"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import type { Holiday, Office } from "@/lib/store/types";

interface HolidayRow {
  date: string;
  label: string;
  byOffice: Record<string, string>; // office_id -> holiday row id
}

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
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [selectedOffices, setSelectedOffices] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const rows = useMemo(() => {
    const map = new Map<string, HolidayRow>();
    for (const h of holidays) {
      const key = `${h.holiday_date}|${h.label}`;
      let row = map.get(key);
      if (!row) {
        row = { date: h.holiday_date, label: h.label, byOffice: {} };
        map.set(key, row);
      }
      row.byOffice[h.office_id] = h.id;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [holidays]);

  function toggleOffice(id: string) {
    setSelectedOffices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (savingRef.current) return;
    if (!date) {
      setError("Pick a date");
      return;
    }
    if (selectedOffices.size === 0) {
      setError("Choose at least one office");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedOffices).map((office_id) =>
          onAdd({ office_id, holiday_date: date, label })
        )
      );
      const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
      if (failures.length > 0) {
        setError(failures.map((f) => f.reason?.message ?? "Something went wrong").join("; "));
      } else {
        setDate("");
        setLabel("");
        setSelectedOffices(new Set());
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-1 text-sm font-semibold text-ink">Office Holidays</h2>
      <p className="mb-4 text-xs text-muted">
        Holidays are set per office. Each employee&apos;s tracker automatically shows the holidays
        for their assigned office (purple), based on the office mapping above — no per-employee
        setup needed. Weekends are excluded and highlighted separately regardless of office.
      </p>
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg bg-surface-2 p-3">
        <label className="text-xs font-medium text-ink-soft">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-md border border-line px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </label>
        <label className="text-xs font-medium text-ink-soft">
          Label
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Diwali"
            className="mt-1 block rounded-md border border-line px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
        </label>
        <div className="text-xs font-medium text-ink-soft">
          Offices
          <div className="mt-1 flex flex-wrap gap-2">
            {offices.map((o) => (
              <label
                key={o.id}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs ${
                  selectedOffices.has(o.id)
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : "border-line text-ink-soft"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedOffices.has(o.id)}
                  onChange={() => toggleOffice(o.id)}
                  className="sr-only"
                />
                {o.name}
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add holiday"}
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Holiday</th>
              {offices.map((o) => (
                <th key={o.id} className="px-3 py-2 text-center whitespace-nowrap">
                  {o.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.date}|${row.label}`} className="border-t border-line">
                <td className="whitespace-nowrap px-3 py-2 text-muted">{row.date}</td>
                <td className="px-3 py-2 font-medium text-ink">{row.label}</td>
                {offices.map((o) => {
                  const holidayId = row.byOffice[o.id];
                  return (
                    <td key={o.id} className="px-3 py-2 text-center">
                      {holidayId ? (
                        <button
                          onClick={() => onRemove(holidayId)}
                          className="group inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 hover:bg-red-100 hover:text-red-600"
                          title="Remove"
                        >
                          <Check size={14} className="group-hover:hidden" />
                          <Trash2 size={12} className="hidden group-hover:block" />
                        </button>
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2 + offices.length} className="px-3 py-6 text-center text-muted">
                  No holidays added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
