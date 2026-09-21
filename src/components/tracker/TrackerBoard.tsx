"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type {
  Brand,
  Holiday,
  Leave,
  Profile,
  Project,
  Task,
  TaskDailyEntry,
} from "@/lib/store/types";
import { daysInMonth, dateKey, isWeekend, monthLabel } from "@/lib/dates";
import { ProjectSection } from "./ProjectSection";
import { NewProjectModal } from "./NewProjectModal";
import { CommentsPanel } from "./CommentsPanel";
import { TrackerViewSelector } from "./TrackerViewSelector";
import { DAY_WIDTH } from "./DateCell";
import { META_TOTAL_WIDTH, META_COLUMNS, dayTintClass } from "./gridConstants";
import type { DayInfo } from "./TaskRow";

export function TrackerBoard({
  currentUser,
  initialProjects,
  initialTasks,
  initialEntries,
  initialLeaves,
  initialHolidays,
  initialBrands,
  initialProfiles,
  initialCommentCounts,
}: {
  currentUser: Profile;
  initialProjects: Project[];
  initialTasks: Task[];
  initialEntries: TaskDailyEntry[];
  initialLeaves: Leave[];
  initialHolidays: Holiday[];
  initialBrands: Brand[];
  initialProfiles: Profile[];
  initialCommentCounts: Record<string, number>;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [entries, setEntries] = useState(initialEntries);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [holidays] = useState(initialHolidays);
  const [brands, setBrands] = useState(initialBrands);
  const [profiles] = useState(initialProfiles);
  const [commentCounts, setCommentCounts] = useState(initialCommentCounts);

  const [showNewProject, setShowNewProject] = useState(false);
  const [commentsTask, setCommentsTask] = useState<Task | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState(currentUser.id);

  const router = useRouter();

  useEffect(() => {
    // One-time read of an external system (the URL) on mount/navigation, per
    // https://react.dev/learn/you-might-not-need-an-effect#subscribing-to-an-external-store
    const openTaskId = new URLSearchParams(window.location.search).get("openTask");
    if (!openTaskId) return;
    const task = tasks.find((t) => t.id === openTaskId);
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCommentsTask(task);
      router.replace("/tracker");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  useEffect(() => {
    function handler(e: Event) {
      const taskId = (e as CustomEvent<string>).detail;
      const task = tasks.find((t) => t.id === taskId);
      if (task) setCommentsTask(task);
    }
    window.addEventListener("open-task-comments", handler);
    return () => window.removeEventListener("open-task-comments", handler);
  }, [tasks]);

  // Holidays are per-office; the tracker only ever shows one person's tasks
  // at a time (their own, or whoever is being viewed), so "is this date a
  // holiday/leave" resolves to a single unambiguous answer per date.
  const holidaysByOffice = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const h of holidays) {
      if (!map[h.office_id]) map[h.office_id] = new Set();
      map[h.office_id].add(h.holiday_date);
    }
    return map;
  }, [holidays]);

  const viewingProfile = useMemo(
    () => profiles.find((p) => p.id === viewingProfileId),
    [profiles, viewingProfileId]
  );

  const viewedHolidayDates = useMemo(
    () => (viewingProfile?.office_id && holidaysByOffice[viewingProfile.office_id]) || new Set<string>(),
    [viewingProfile, holidaysByOffice]
  );

  const viewedLeaveDates = useMemo(() => {
    const set = new Set<string>();
    for (const l of leaves) {
      if (l.profile_id === viewingProfileId) set.add(l.leave_date);
    }
    return set;
  }, [leaves, viewingProfileId]);

  const days: DayInfo[] = useMemo(() => {
    const total = daysInMonth(year, month);
    const list: DayInfo[] = [];
    for (let day = 1; day <= total; day++) {
      const key = dateKey(year, month, day);
      list.push({
        key,
        day,
        isWeekend: isWeekend(year, month, day),
        isHoliday: viewedHolidayDates.has(key),
        isLeave: viewedLeaveDates.has(key),
      });
    }
    return list;
  }, [year, month, viewedHolidayDates, viewedLeaveDates]);

  const entriesByTask = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const e of entries) {
      if (!map[e.task_id]) map[e.task_id] = {};
      map[e.task_id][e.entry_date] = e.hours;
    }
    return map;
  }, [entries]);

  const profilesById = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  const canManage = currentUser.role === "manager";
  const canComment = currentUser.role === "manager" || currentUser.role === "lead";

  const viewedTasks = useMemo(
    () => tasks.filter((t) => t.owner_id === viewingProfileId),
    [tasks, viewingProfileId]
  );
  const canCreateForViewedPerson = viewingProfileId === currentUser.id || canManage;

  const dailyGrandTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of days) {
      let total = 0;
      for (const task of viewedTasks) {
        total += entriesByTask[task.id]?.[d.key] ?? 0;
      }
      map[d.key] = total;
    }
    return map;
  }, [days, viewedTasks, entriesByTask]);

  // Flat, render-order list of every visible task id, used to resolve
  // "up"/"down" arrow-key navigation across project section boundaries.
  const orderedTaskIds = useMemo(
    () => projects.flatMap((p) => viewedTasks.filter((t) => t.project_id === p.id).map((t) => t.id)),
    [projects, viewedTasks]
  );
  const dayKeys = useMemo(() => days.map((d) => d.key), [days]);

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  function registerCellRef(taskId: string, dateKey: string) {
    return (el: HTMLInputElement | null) => {
      const key = `${taskId}|${dateKey}`;
      if (el) cellRefs.current.set(key, el);
      else cellRefs.current.delete(key);
    };
  }

  function navigateCell(taskId: string, dateKey: string, direction: "up" | "down" | "left" | "right") {
    const taskIdx = orderedTaskIds.indexOf(taskId);
    const dayIdx = dayKeys.indexOf(dateKey);
    if (taskIdx === -1 || dayIdx === -1) return;
    let nextTaskIdx = taskIdx;
    let nextDayIdx = dayIdx;
    if (direction === "left") nextDayIdx = Math.max(0, dayIdx - 1);
    if (direction === "right") nextDayIdx = Math.min(dayKeys.length - 1, dayIdx + 1);
    if (direction === "up") nextTaskIdx = Math.max(0, taskIdx - 1);
    if (direction === "down") nextTaskIdx = Math.min(orderedTaskIds.length - 1, taskIdx + 1);
    const nextKey = `${orderedTaskIds[nextTaskIdx]}|${dayKeys[nextDayIdx]}`;
    const nextEl = cellRefs.current.get(nextKey);
    if (nextEl) {
      nextEl.focus();
      nextEl.select();
    }
  }

  function goToMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  async function updateTask(taskId: string, patch: Partial<Task>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not update task");
      return;
    }
    const { task } = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
  }

  async function changeHours(taskId: string, date: string, hours: number) {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, entry_date: date, hours }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not save hours");
      return;
    }
    const { entry } = await res.json();
    setEntries((prev) => {
      const withoutOld = prev.filter((e) => !(e.task_id === taskId && e.entry_date === date));
      return entry ? [...withoutOld, entry] : withoutOld;
    });
  }

  async function toggleLeave(profileId: string, date: string) {
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId, leave_date: date }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not update leave");
      return;
    }
    const { marked } = await res.json();
    setLeaves((prev) => {
      if (marked) {
        return [
          ...prev,
          {
            id: `${profileId}-${date}`,
            profile_id: profileId,
            leave_date: date,
            hours: 8,
            created_at: new Date().toISOString(),
          },
        ];
      }
      return prev.filter((l) => !(l.profile_id === profileId && l.leave_date === date));
    });
    if (marked) {
      const ownedTaskIds = tasks.filter((t) => t.owner_id === profileId).map((t) => t.id);
      setEntries((prev) =>
        prev.filter((e) => !(ownedTaskIds.includes(e.task_id) && e.entry_date === date))
      );
    }
  }

  async function requestNewBrand(name: string): Promise<string | null> {
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not request brand");
      return null;
    }
    const { brand } = await res.json();
    setBrands((prev) => [...prev, brand]);
    return brand.id as string;
  }

  async function createTask(projectId: string, input: { name: string; brand_id: string }) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, owner_id: viewingProfileId, ...input }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Could not create task");
    }
    const { task } = await res.json();
    setTasks((prev) => [...prev, task]);
  }

  async function createProject(input: { name: string; start_date: string; end_date: string }) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Could not create project");
    }
    const { project } = await res.json();
    setProjects((prev) => [project, ...prev]);
  }

  async function renameProject(projectId: string, name: string) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not rename project");
      return;
    }
    const { project } = await res.json();
    setProjects((prev) => prev.map((p) => (p.id === projectId ? project : p)));
  }

  async function deleteProject(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not delete project");
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTasks((prev) => prev.filter((t) => t.project_id !== projectId));
  }

  async function deleteTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not delete task");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setEntries((prev) => prev.filter((e) => e.task_id !== taskId));
  }

  const gridWidth = META_TOTAL_WIDTH + days.length * DAY_WIDTH;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-slate-800">
            {monthLabel(year, month)}
          </span>
          <button
            onClick={() => goToMonth(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        {currentUser.role !== "employee" && (
          <TrackerViewSelector
            currentUser={currentUser}
            profiles={profiles}
            viewingProfileId={viewingProfileId}
            onChange={setViewingProfileId}
          />
        )}
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div style={{ minWidth: gridWidth }}>
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="sticky left-0 z-10 flex shrink-0 bg-slate-50">
              {META_COLUMNS.map((c) => (
                <div
                  key={c.key}
                  className="shrink-0 overflow-hidden truncate whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  style={{ width: c.width }}
                  title={c.label}
                >
                  {c.label}
                </div>
              ))}
            </div>
            <div className="flex shrink-0">
              {days.map((d) => (
                <div
                  key={d.key}
                  className={`flex h-full shrink-0 items-center justify-center border-r border-slate-100 text-xs font-medium text-slate-500 ${dayTintClass(d)}`}
                  style={{ width: DAY_WIDTH }}
                  title={d.isLeave ? "Leave" : d.isHoliday ? "Holiday" : d.isWeekend ? "Weekend" : undefined}
                >
                  {d.day}
                </div>
              ))}
            </div>
          </div>

          {projects.length > 0 && (
            <div className="flex border-b border-slate-200 bg-slate-100">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-center bg-slate-100 py-2.5 pl-3 pr-2 text-sm font-semibold text-slate-700"
                style={{ width: META_TOTAL_WIDTH }}
              >
                Total (all projects)
              </div>
              <div className="flex shrink-0">
                {days.map((d) => {
                  const total = dailyGrandTotals[d.key];
                  return (
                    <div
                      key={d.key}
                      className={`flex h-full items-center justify-center border-r border-slate-200 text-xs font-semibold text-slate-700 ${dayTintClass(d)}`}
                      style={{ width: DAY_WIDTH }}
                    >
                      {total > 0 ? total : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {projects.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">
              No projects yet. Create one to get started.
            </div>
          )}

          {projects.map((project) => (
            <ProjectSection
              key={project.id}
              projectName={project.name}
              tasks={viewedTasks.filter((t) => t.project_id === project.id)}
              brands={brands}
              days={days}
              currentUser={currentUser}
              entriesByTask={entriesByTask}
              commentCounts={commentCounts}
              canCreateTask={canCreateForViewedPerson}
              onUpdateTask={updateTask}
              onChangeHours={changeHours}
              onToggleLeave={toggleLeave}
              onRequestNewBrand={requestNewBrand}
              onOpenComments={setCommentsTask}
              onCreateTask={(input) => createTask(project.id, input)}
              onRenameProject={(name) => renameProject(project.id, name)}
              onDeleteProject={() => deleteProject(project.id)}
              onDeleteTask={deleteTask}
              registerCellRef={registerCellRef}
              onNavigate={navigateCell}
            />
          ))}
        </div>
      </div>

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreate={createProject} />
      )}

      {commentsTask && (
        <CommentsPanel
          taskId={commentsTask.id}
          taskName={commentsTask.name}
          currentUser={currentUser}
          profilesById={profilesById}
          canPost={commentsTask.owner_id === currentUser.id || canComment}
          onClose={() => setCommentsTask(null)}
          onCommentAdded={(taskId) =>
            setCommentCounts((prev) => ({ ...prev, [taskId]: (prev[taskId] ?? 0) + 1 }))
          }
        />
      )}
    </div>
  );
}
