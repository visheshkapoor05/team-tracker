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
        className="flex w-full items-center rounded-md border border-line bg-surface p-0.5 pr-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        <span className={`status-pill status-pill-${current.value} rounded-[5px] px-1.5 py-1`}>
          <span className="status-dot" />
          <span className="truncate">{current.label}</span>
        </span>
        {!disabled && (
          <ChevronDown
            size={12}
            className={`ml-auto shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
      <DropdownPortal anchorRef={ref} open={open} onClose={() => setOpen(false)} width={170}>
        {TASK_STATUSES.map((s, i) => (
          <button
            key={s.value}
            onClick={() => {
              onChange(s.value);
              setOpen(false);
            }}
            style={{ animationDelay: `${i * 25}ms` }}
            className="dropdown-item-in flex w-full rounded-md px-1.5 py-1 text-left hover:bg-surface-2"
          >
            <span className={`status-pill status-pill-${s.value} rounded-full px-2.5 py-1`}>
              <span className="status-dot" />
              {s.label}
            </span>
          </button>
        ))}
      </DropdownPortal>
    </>
  );
}
