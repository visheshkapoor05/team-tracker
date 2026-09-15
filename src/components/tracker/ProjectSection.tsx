"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Brand, Profile, Task } from "@/lib/store/types";
import { TaskRow, type DayInfo } from "./TaskRow";
import { NewTaskRow } from "./NewTaskRow";
import { DAY_WIDTH } from "./DateCell";
import { META_TOTAL_WIDTH, dayTintClass } from "./gridConstants";

export function ProjectSection({
  projectName,
  tasks,
  brands,
  days,
  currentUser,
  entriesByTask,
  commentCounts,
  canCreateTask,
  onUpdateTask,
  onChangeHours,
  onToggleLeave,
  onRequestNewBrand,
  onOpenComments,
  onCreateTask,
}: {
  projectName: string;
  tasks: Task[];
  brands: Brand[];
  days: DayInfo[];
  currentUser: Profile;
  entriesByTask: Record<string, Record<string, number>>;
  commentCounts: Record<string, number>;
  canCreateTask: boolean;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
  onChangeHours: (taskId: string, date: string, hours: number) => void;
  onToggleLeave: (profileId: string, date: string) => void;
  onRequestNewBrand: (name: string) => Promise<string | null>;
  onOpenComments: (task: Task) => void;
  onCreateTask: (input: { name: string; brand_id: string }) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const canManage = currentUser.role === "manager";

  const dailyTotals: Record<string, number> = {};
  for (const d of days) {
    let total = 0;
    for (const task of tasks) {
      total += entriesByTask[task.id]?.[d.key] ?? 0;
    }
    dailyTotals[d.key] = total;
  }

  return (
    <div className="border-b border-slate-200">
      <div className="flex bg-indigo-100/70">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="sticky left-0 z-10 flex shrink-0 items-center gap-2 bg-indigo-100/95 py-2.5 pl-3 pr-2 text-sm font-semibold text-indigo-900"
          style={{ width: META_TOTAL_WIDTH }}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className="truncate">{projectName}</span>
          <span className="ml-auto shrink-0 text-xs font-normal text-indigo-500">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </span>
        </button>
        <div className="flex shrink-0">
          {days.map((d) => {
            const total = dailyTotals[d.key];
            return (
              <div
                key={d.key}
                className={`flex h-full items-center justify-center border-r border-indigo-200/60 text-xs font-medium text-indigo-800 ${dayTintClass(d)}`}
                style={{ width: DAY_WIDTH }}
              >
                {total > 0 ? total : ""}
              </div>
            );
          })}
        </div>
      </div>

      {expanded && (
        <>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              brands={brands}
              days={days}
              hoursByDate={entriesByTask[task.id] ?? {}}
              canEdit={task.owner_id === currentUser.id || canManage}
              canToggleLeave={task.owner_id === currentUser.id || canManage}
              commentCount={commentCounts[task.id] ?? 0}
              onUpdateTask={(patch) => onUpdateTask(task.id, patch)}
              onChangeHours={(date, hours) => onChangeHours(task.id, date, hours)}
              onToggleLeave={(date) => onToggleLeave(task.owner_id, date)}
              onRequestNewBrand={onRequestNewBrand}
              onOpenComments={() => onOpenComments(task)}
            />
          ))}
          {canCreateTask && (
            <NewTaskRow brands={brands} onCreate={onCreateTask} onRequestNewBrand={onRequestNewBrand} />
          )}
        </>
      )}
    </div>
  );
}
