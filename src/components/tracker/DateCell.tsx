"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { DropdownPortal } from "@/components/ui/DropdownPortal";

export const DAY_WIDTH = 40;

export function DateCell({
  hours,
  isLeave,
  isWeekend,
  isHoliday,
  editable,
  canToggleLeave,
  onChangeHours,
  onToggleLeave,
  inputRef,
  onNavigate,
}: {
  hours: number | undefined;
  isLeave: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  editable: boolean;
  canToggleLeave: boolean;
  onChangeHours: (hours: number) => void;
  onToggleLeave: () => void;
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

  const bg = isLeave ? "cell-leave" : isHoliday ? "cell-holiday" : isWeekend ? "col-weekend" : "";

  return (
    <div
      className={`relative flex h-9 shrink-0 items-center justify-center border-b border-r border-slate-100 ${bg}`}
      style={{ width: DAY_WIDTH }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isLeave ? (
        <span className="text-[10px] font-medium text-orange-700">Leave</span>
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
          className="h-full w-full bg-transparent text-center text-xs outline-none disabled:cursor-not-allowed"
          placeholder=""
        />
      )}
      {canToggleLeave && (hover || menuOpen) && (
        <button
          ref={menuBtnRef}
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-bl bg-slate-200/80 text-slate-600 hover:bg-slate-300"
        >
          <MoreHorizontal size={9} />
        </button>
      )}
      <DropdownPortal
        anchorRef={menuBtnRef}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        width={128}
        align="right"
      >
        <button
          onClick={() => {
            onToggleLeave();
            setMenuOpen(false);
          }}
          className="block w-full px-2.5 py-1.5 text-left text-xs hover:bg-slate-50"
        >
          {isLeave ? "Clear leave" : "Mark as leave"}
        </button>
      </DropdownPortal>
    </div>
  );
}
