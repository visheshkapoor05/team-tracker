"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toDateKey } from "@/lib/dates";

export function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { name: string; start_date: string; end_date: string }) => Promise<void>;
}) {
  const today = toDateKey(new Date());
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({ name, start_date: startDate, end_date: endDate });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">New Project</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-slate-600">
            Project name
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              placeholder="e.g. Chatbot Platform"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs font-medium text-slate-600">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            <label className="flex-1 text-xs font-medium text-slate-600">
              End date
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={saving}
            className="mt-1 w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}
