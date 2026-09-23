"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Brand } from "@/lib/store/types";
import { BrandDropdown } from "./BrandDropdown";
import { META_TOTAL_WIDTH } from "./gridConstants";

export function NewTaskRow({
  brands,
  onCreate,
  onRequestNewBrand,
}: {
  brands: Brand[];
  onCreate: (input: { name: string; brand_id: string }) => Promise<void>;
  onRequestNewBrand: (name: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Task name is required");
      return;
    }
    if (!brandId) {
      setError("Choose a brand (or request a new one) before saving");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({ name, brand_id: brandId });
      setName("");
      setBrandId("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="sticky left-0 z-10 flex items-center gap-1.5 bg-white py-2 pl-8 text-xs font-medium text-indigo-600 transition-all duration-150 hover:gap-2 hover:text-indigo-700 active:scale-[0.98]"
        style={{ width: META_TOTAL_WIDTH }}
      >
        <Plus size={12} /> New Task
      </button>
    );
  }

  return (
    <div
      className="sticky left-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-indigo-50/40 px-4 py-2"
      style={{ width: META_TOTAL_WIDTH }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task name"
        className="min-w-[180px] flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <BrandDropdown
        value={brandId}
        brands={brands}
        onChange={setBrandId}
        onRequestNew={onRequestNewBrand}
      />
      <button
        onClick={submit}
        disabled={saving}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all duration-150 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
      >
        {saving ? "Saving…" : "Add task"}
      </button>
      <button
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="rounded-md px-2 py-1.5 text-xs text-slate-400 transition-all duration-150 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
