"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { TASK_STATUSES, type TaskStatus } from "@/lib/store/types";
import { DropdownPortal } from "@/components/ui/DropdownPortal";

export function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const current = TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];

  return (
    <>
      <button
        ref={ref}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: current.dot }}
        />
        <span className="truncate">{current.label}</span>
        {!disabled && <ChevronDown size={12} className="ml-auto shrink-0 text-slate-400" />}
      </button>
      <DropdownPortal anchorRef={ref} open={open} onClose={() => setOpen(false)} width={160}>
        {TASK_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              onChange(s.value);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.dot }} />
            {s.label}
          </button>
        ))}
      </DropdownPortal>
    </>
  );
}
