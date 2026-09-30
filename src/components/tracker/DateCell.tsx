"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { DropdownPortal } from "@/components/ui/DropdownPortal";
import type { LeaveType } from "@/lib/store/types";

export const DAY_WIDTH = 40;

export function DateCell({
  hours,
  isLeave,
  isHalfLeave,
  isWeekend,
  isHoliday,
  editable,
  canToggleLeave,
  onChangeHours,
  onSetLeave,
  inputRef,
  onNavigate,
}: {
  hours: number | undefined;
  isLeave: boolean;
  isHalfLeave: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  editable: boolean;
  canToggleLeave: boolean;
  onChangeHours: (hours: number) => void;
  onSetLeave: (type: LeaveType) => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  onNavigate?: (direction: "up" | "down" | "left" | "right") => void;
}) {
  const [value, setValue] = useState(hours !== undefined ? String(hours) : "");
  const [syncedHours, setSyncedHours] = useState(hours);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  if (hours !== syncedHours) {
    setSyncedHours(hours);
    setValue(hours !== undefined ? String(hours) : "");
  }

  function commit() {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n)) {
      if (hours !== undefined) onChangeHours(0);
      return;
    }
    if (n !== hours) onChangeHours(Math.max(0, Math.min(24, n)));
  }

  // An untinted cell must still be explicitly white — otherwise it falls
  // through to whatever's behind the row (the page background), which reads
  // as an unwanted grey fill on every ordinary day. Half-day leave keeps the
  // normal background and layers a diagonal wash on top (see .cell-half-leave)
  // rather than replacing it, since the cell still behaves like a normal
  // editable day.
  const bg = isLeave
    ? "cell-leave"
    : isHalfLeave
      ? "cell-half-leave bg-surface"
      : isHoliday
        ? "cell-holiday"
        : isWeekend
          ? "col-weekend"
          : "bg-surface";

  const menuItems: { label: string; type: LeaveType }[] = isLeave
    ? [
        { label: "Mark half-day leave", type: "half" },
        { label: "Clear leave", type: "none" },
      ]
    : isHalfLeave
      ? [
          { label: "Mark full-day leave", type: "full" },
          { label: "Clear leave", type: "none" },
        ]
      : [
          { label: "Mark as leave", type: "full" },
          { label: "Mark half-day leave", type: "half" },
        ];

  return (
    <div
      className={`relative flex h-full shrink-0 items-center justify-center after:absolute after:right-0 after:top-1.5 after:bottom-1.5 after:w-px after:bg-line after:content-[''] ${bg}`}
      style={{ width: DAY_WIDTH }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isLeave ? (
        <span className="text-[10px] font-medium text-leave">Leave</span>
      ) : (
        <input
          ref={inputRef}
          disabled={!editable}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.currentTarget as HTMLInputElement).blur();
              return;
            }
            const directions: Record<string, "up" | "down" | "left" | "right"> = {
              ArrowUp: "up",
              ArrowDown: "down",
              ArrowLeft: "left",
              ArrowRight: "right",
            };
            const direction = directions[e.key];
            if (direction && onNavigate) {
              e.preventDefault();
              onNavigate(direction);
            }
          }}
          inputMode="decimal"
          className="tabular h-full w-full bg-transparent text-center text-xs outline-none transition-all duration-150 focus:bg-indigo-50 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-400 disabled:cursor-not-allowed placeholder:text-[8px] placeholder:text-leave"
          placeholder={isHalfLeave ? "Half leave" : ""}
        />
      )}
      {canToggleLeave && (hover || menuOpen) && (
        <button
          ref={menuBtnRef}
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-bl bg-line/80 text-ink-soft transition-all duration-150 hover:bg-indigo-200 hover:text-indigo-800 active:scale-90"
        >
          <MoreHorizontal size={9} />
        </button>
      )}
      <DropdownPortal
        anchorRef={menuBtnRef}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        width={150}
        align="right"
      >
        {menuItems.map((item) => (
          <button
            key={item.type}
            onClick={() => {
              onSetLeave(item.type);
              setMenuOpen(false);
            }}
            className="dropdown-item-in block w-full rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-surface-2"
          >
            {item.label}
          </button>
        ))}
      </DropdownPortal>
    </div>
  );
}
