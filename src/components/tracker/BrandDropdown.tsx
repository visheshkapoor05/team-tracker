"use client";

import { useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { Brand } from "@/lib/store/types";
import { DropdownPortal } from "@/components/ui/DropdownPortal";

export function BrandDropdown({
  value,
  brands,
  onChange,
  onRequestNew,
  disabled,
}: {
  value: string;
  brands: Brand[];
  onChange: (brandId: string) => void;
  onRequestNew: (name: string) => Promise<string | null>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLButtonElement>(null);
  // React state updates aren't synchronous, so a plain `disabled={submitting}`
  // still leaves a gap between click and re-render. This ref closes it.
  const submittingRef = useRef(false);

  const approved = brands.filter((b) => b.status === "approved");
  const current = brands.find((b) => b.id === value);

  function close() {
    setOpen(false);
    setAdding(false);
    setNewName("");
  }

  async function submitNew() {
    const name = newName.trim();
    if (!name || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const id = await onRequestNew(name);
      close();
      if (id) onChange(id);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        ref={ref}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        <span className="truncate">{current?.name ?? "Select brand"}</span>
        {current?.status === "pending" && (
          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            Pending approval
          </span>
        )}
        {current?.status === "rejected" && (
          <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
            Rejected
          </span>
        )}
        {!disabled && <ChevronDown size={12} className="ml-auto shrink-0 text-slate-400" />}
      </button>
      <DropdownPortal anchorRef={ref} open={open} onClose={close} width={224}>
        {approved.map((b, i) => (
          <button
            key={b.id}
            onClick={() => {
              onChange(b.id);
              close();
            }}
            style={{ animationDelay: `${Math.min(i, 6) * 20}ms` }}
            className="dropdown-item-in block w-full truncate rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
          >
            {b.name}
          </button>
        ))}
        <div className="my-1 border-t border-slate-100" />
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50"
          >
            <Plus size={12} /> Add new brand
          </button>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1.5">
            <input
              autoFocus
              disabled={submitting}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNew()}
              placeholder="Brand name"
              className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-indigo-400 disabled:opacity-60"
            />
            <button
              onClick={submitNew}
              disabled={submitting || !newName.trim()}
              className="shrink-0 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add"}
            </button>
          </div>
        )}
      </DropdownPortal>
    </>
  );
}
