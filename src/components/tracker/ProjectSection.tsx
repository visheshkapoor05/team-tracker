"use client";

import { useState } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
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
  onRenameProject,
  onDeleteProject,
  onDeleteTask,
  registerCellRef,
  onNavigate,
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
  onRenameProject: (name: string) => void;
  onDeleteProject: () => void;
  onDeleteTask: (taskId: string) => void;
  registerCellRef?: (taskId: string, dateKey: string) => (el: HTMLInputElement | null) => void;
  onNavigate?: (taskId: string, dateKey: string, direction: "up" | "down" | "left" | "right") => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const canManage = currentUser.role === "manager";

  function commitRename() {
    setRenaming(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== projectName) onRenameProject(trimmed);
    else setDraftName(projectName);
  }

  function handleDeleteProject() {
    if (
      window.confirm(
        `Delete project "${projectName}" and all its tasks? This removes all logged hours and comments too, and cannot be undone.`
      )
    ) {
      onDeleteProject();
    }
  }

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
        <div
          className="sticky left-0 z-10 flex shrink-0 items-center gap-2 bg-indigo-100/95 py-2.5 pl-3 pr-2 text-sm font-semibold text-indigo-900"
          style={{ width: META_TOTAL_WIDTH }}
        >
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 shrink-0 items-center gap-2 transition-transform duration-150 active:scale-90"
          >
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
            />
          </button>
          {renaming ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setDraftName(projectName);
                  setRenaming(false);
                }
              }}
              className="min-w-0 flex-1 rounded border border-indigo-300 bg-white px-1 py-0.5 text-sm font-semibold text-indigo-900 outline-none"
            />
          ) : (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="min-w-0 flex-1 truncate text-left"
              title={projectName}
            >
              {projectName}
            </button>
          )}
          {canManage && !renaming && (
            <span className="flex shrink-0 items-center gap-1 text-indigo-400">
              <button
                onClick={() => {
                  setDraftName(projectName);
                  setRenaming(true);
                }}
                className="rounded p-0.5 transition-all duration-150 hover:bg-white/70 hover:text-indigo-700 active:scale-90"
                title="Rename project"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={handleDeleteProject}
                className="rounded p-0.5 transition-all duration-150 hover:bg-white/70 hover:text-red-600 active:scale-90"
                title="Delete project"
              >
                <Trash2 size={13} />
              </button>
            </span>
          )}
          <span className="ml-auto shrink-0 text-xs font-normal text-indigo-500">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </span>
        </div>
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
              onDeleteTask={() => onDeleteTask(task.id)}
              registerCellRef={registerCellRef ? (dateKey) => registerCellRef(task.id, dateKey) : undefined}
              onNavigate={onNavigate ? (dateKey, direction) => onNavigate(task.id, dateKey, direction) : undefined}
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
