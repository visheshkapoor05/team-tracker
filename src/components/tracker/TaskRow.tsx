"use client";

import { MessageCircle } from "lucide-react";
import type { Brand, Task, TaskStatus } from "@/lib/store/types";
import { StatusDropdown } from "./StatusDropdown";
import { BrandDropdown } from "./BrandDropdown";
import { DateCell, DAY_WIDTH } from "./DateCell";
import { META_COLUMNS } from "./gridConstants";

export interface DayInfo {
  key: string;
  day: number;
  isWeekend: boolean;
}

export function TaskRow({
  task,
  brands,
  days,
  hoursByDate,
  leaveDates,
  holidayDates,
  canEdit,
  canToggleLeave,
  commentCount,
  onUpdateTask,
  onChangeHours,
  onToggleLeave,
  onRequestNewBrand,
  onOpenComments,
}: {
  task: Task;
  brands: Brand[];
  days: DayInfo[];
  hoursByDate: Record<string, number>;
  leaveDates: Set<string>;
  holidayDates: Set<string>;
  canEdit: boolean;
  canToggleLeave: boolean;
  commentCount: number;
  onUpdateTask: (patch: Partial<Task>) => void;
  onChangeHours: (date: string, hours: number) => void;
  onToggleLeave: (date: string) => void;
  onRequestNewBrand: (name: string) => Promise<string | null>;
  onOpenComments: () => void;
}) {
  const rowClass = task.status === "done" ? "row-done" : task.status === "hold" ? "row-hold" : "";
  const metaBgClass =
    task.status === "done" ? "bg-slate-100" : task.status === "hold" ? "row-hold bg-white" : "bg-white";

  return (
    <div className={`flex border-b border-slate-100 ${rowClass}`}>
      <div className={`sticky left-0 z-10 flex shrink-0 ${metaBgClass}`}>
        <div
          className="flex shrink-0 items-center gap-2 py-2 pl-8 pr-2 text-sm text-slate-700"
          style={{ width: META_COLUMNS[0].width }}
        >
          <span className="truncate">{task.name}</span>
        </div>
        <div
          className="flex shrink-0 items-center px-2 py-2"
          style={{ width: META_COLUMNS[1].width }}
        >
          <StatusDropdown
            value={task.status}
            disabled={!canEdit}
            onChange={(status: TaskStatus) => onUpdateTask({ status })}
          />
        </div>
        <div
          className="flex shrink-0 items-center px-2 py-2"
          style={{ width: META_COLUMNS[2].width }}
        >
          <BrandDropdown
            value={task.brand_id}
            brands={brands}
            disabled={!canEdit}
            onChange={(brand_id) => onUpdateTask({ brand_id })}
            onRequestNew={onRequestNewBrand}
          />
        </div>
        <div
          className="flex shrink-0 items-center px-2 py-2"
          style={{ width: META_COLUMNS[3].width }}
        >
          <input
            type="date"
            disabled={!canEdit}
            value={task.start_date ?? ""}
            onChange={(e) => onUpdateTask({ start_date: e.target.value || null })}
            className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div
          className="flex shrink-0 items-center px-2 py-2"
          style={{ width: META_COLUMNS[4].width }}
        >
          <input
            type="date"
            disabled={!canEdit}
            value={task.end_date ?? ""}
            onChange={(e) => onUpdateTask({ end_date: e.target.value || null })}
            className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div
          className="flex shrink-0 items-center justify-center px-2 py-2"
          style={{ width: META_COLUMNS[5].width }}
        >
          <button onClick={onOpenComments} className="relative text-slate-400 hover:text-indigo-600">
            <MessageCircle size={18} />
            {commentCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                {commentCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className="flex shrink-0">
        {days.map((d) => (
          <DateCell
            key={d.key}
            hours={hoursByDate[d.key]}
            isLeave={leaveDates.has(d.key)}
            isWeekend={d.isWeekend}
            isHoliday={holidayDates.has(d.key)}
            editable={canEdit && !leaveDates.has(d.key)}
            canToggleLeave={canToggleLeave}
            onChangeHours={(h) => onChangeHours(d.key, h)}
            onToggleLeave={() => onToggleLeave(d.key)}
          />
        ))}
      </div>
    </div>
  );
}

export { DAY_WIDTH };
