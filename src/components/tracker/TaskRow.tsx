"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import type { Brand, Task, TaskStatus } from "@/lib/store/types";
import { StatusDropdown } from "./StatusDropdown";
import { BrandDropdown } from "./BrandDropdown";
import { DateCell, DAY_WIDTH } from "./DateCell";
import { META_COLUMNS } from "./gridConstants";

export interface DayInfo {
  key: string;
  day: number;
  isWeekend: boolean;
  // Scoped to whichever person's tracker is currently being viewed — the
  // grid always shows exactly one person's tasks at a time, so this is
  // unambiguous across every row.
  isHoliday: boolean;
  isLeave: boolean;
}

export function TaskRow({
  task,
  brands,
  days,
  hoursByDate,
  canEdit,
  canToggleLeave,
  commentCount,
  onUpdateTask,
  onChangeHours,
  onToggleLeave,
  onRequestNewBrand,
  onOpenComments,
  onDeleteTask,
  registerCellRef,
  onNavigate,
}: {
  task: Task;
  brands: Brand[];
  days: DayInfo[];
  hoursByDate: Record<string, number>;
  canEdit: boolean;
  canToggleLeave: boolean;
  commentCount: number;
  onUpdateTask: (patch: Partial<Task>) => void;
  onChangeHours: (date: string, hours: number) => void;
  onToggleLeave: (date: string) => void;
  onRequestNewBrand: (name: string) => Promise<string | null>;
  onOpenComments: () => void;
  onDeleteTask: () => void;
  registerCellRef?: (dateKey: string) => (el: HTMLInputElement | null) => void;
  onNavigate?: (dateKey: string, direction: "up" | "down" | "left" | "right") => void;
}) {
  const rowClass = task.status === "done" ? "row-done" : task.status === "hold" ? "row-hold" : "";
  const metaBgClass =
    task.status === "done" ? "bg-slate-100" : task.status === "hold" ? "row-hold bg-white" : "bg-white";

  // A one-shot flash across the whole row the moment status actually
  // changes to Done or Hold — separate from row-done/row-hold's persistent
  // resting style, which would otherwise replay on every remount instead
  // of just the change itself. Comparing against the previous render's
  // status inline (rather than in an effect) is the documented React
  // pattern for reacting to a prop change without an extra render pass.
  const [prevStatus, setPrevStatus] = useState(task.status);
  const [flashClass, setFlashClass] = useState("");
  if (prevStatus !== task.status) {
    setPrevStatus(task.status);
    if (task.status === "done") setFlashClass("row-flash-done");
    else if (task.status === "hold") setFlashClass("row-flash-hold");
    else setFlashClass("");
  }
  useEffect(() => {
    if (!flashClass) return;
    const t = setTimeout(() => setFlashClass(""), 900);
    return () => clearTimeout(t);
  }, [flashClass]);

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(task.name);

  function commitRename() {
    setRenaming(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== task.name) onUpdateTask({ name: trimmed });
    else setDraftName(task.name);
  }

  function handleDelete() {
    if (window.confirm(`Delete task "${task.name}"? This removes all logged hours and comments for it.`)) {
      onDeleteTask();
    }
  }

  return (
    <div className={`relative flex border-b border-slate-100 ${rowClass}`}>
      {flashClass && <div className={`pointer-events-none absolute inset-0 z-20 ${flashClass}`} />}
      <div className={`sticky left-0 z-10 flex shrink-0 ${metaBgClass}`}>
        <div
          className="flex shrink-0 items-center gap-1 py-2 pl-8 pr-2 text-sm text-slate-700"
          style={{ width: META_COLUMNS[0].width }}
        >
          {renaming ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setDraftName(task.name);
                  setRenaming(false);
                }
              }}
              className="min-w-0 flex-1 rounded border border-indigo-300 px-1 py-0.5 text-sm outline-none"
            />
          ) : (
            <span className="truncate" title={task.name}>
              {task.name}
            </span>
          )}
          {canEdit && !renaming && (
            <span className="ml-auto flex shrink-0 items-center gap-1 text-slate-300">
              <button
                onClick={() => {
                  setDraftName(task.name);
                  setRenaming(true);
                }}
                className="rounded p-0.5 transition-all duration-150 hover:bg-accent-wash hover:text-indigo-600 active:scale-90"
                title="Rename task"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={handleDelete}
                className="rounded p-0.5 transition-all duration-150 hover:bg-danger-wash hover:text-red-600 active:scale-90"
                title="Delete task"
              >
                <Trash2 size={12} />
              </button>
            </span>
          )}
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
            className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs outline-none transition-all duration-150 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs outline-none transition-all duration-150 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div
          className="flex shrink-0 items-center justify-center px-2 py-2"
          style={{ width: META_COLUMNS[5].width }}
        >
          <button
            onClick={onOpenComments}
            className="relative rounded p-1 text-slate-400 transition-all duration-150 hover:bg-accent-wash hover:text-indigo-600 active:scale-90"
          >
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
            isLeave={d.isLeave}
            isWeekend={d.isWeekend}
            isHoliday={d.isHoliday}
            editable={canEdit && !d.isLeave}
            canToggleLeave={canToggleLeave}
            onChangeHours={(h) => onChangeHours(d.key, h)}
            onToggleLeave={() => onToggleLeave(d.key)}
            inputRef={registerCellRef?.(d.key)}
            onNavigate={(direction) => onNavigate?.(d.key, direction)}
          />
        ))}
      </div>
    </div>
  );
}

export { DAY_WIDTH };
