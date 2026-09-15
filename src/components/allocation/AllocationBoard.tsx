"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Brand,
  Holiday,
  Leave,
  Office,
  Profile,
  Project,
  Task,
  TaskDailyEntry,
} from "@/lib/store/types";
import { monthLabel, workingDaysInMonth } from "@/lib/dates";
import { EmployeeAllocationMatrix } from "./EmployeeAllocationMatrix";

const PALETTE = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#8B5CF6",
  "#F97316",
  "#14B8A6",
];
const LEAVE_COLOR = "#94A3B8";

export function AllocationBoard({
  currentUser,
  projects,
  tasks,
  entries,
  leaves,
  holidays,
  brands,
  profiles,
  offices,
}: {
  currentUser: Profile;
  projects: Project[];
  tasks: Task[];
  entries: TaskDailyEntry[];
  leaves: Leave[];
  holidays: Holiday[];
  brands: Brand[];
  profiles: Profile[];
  offices: Office[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function goToMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Only the people this viewer can actually see — an employee only ever
  // has their own tasks in `tasks`, so scoping the roster the same way keeps
  // the team-wide totals below consistent with what's actually visible.
  const visibleProfiles =
    currentUser.role === "employee" ? profiles.filter((p) => p.id === currentUser.id) : profiles;

  const holidaysByOffice = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const h of holidays) {
      (map[h.office_id] ??= new Set()).add(h.holiday_date);
    }
    return map;
  }, [holidays]);

  const officesById = useMemo(() => {
    const map: Record<string, Office> = {};
    for (const o of offices) map[o.id] = o;
    return map;
  }, [offices]);

  // Each employee's working hours depend on their own office's holiday
  // calendar, not one shared company-wide number.
  const workingHoursByProfile = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of visibleProfiles) {
      const holidaySet = (p.office_id && holidaysByOffice[p.office_id]) || new Set<string>();
      map[p.id] = workingDaysInMonth(year, month, holidaySet) * 8;
    }
    return map;
  }, [visibleProfiles, holidaysByOffice, year, month]);

  const teamTotalWorkingHours = useMemo(
    () => Object.values(workingHoursByProfile).reduce((sum, h) => sum + h, 0),
    [workingHoursByProfile]
  );

  const tasksById = useMemo(() => {
    const map: Record<string, Task> = {};
    for (const t of tasks) map[t.id] = t;
    return map;
  }, [tasks]);

  const brandName = useCallback(
    (id: string) => brands.find((b) => b.id === id)?.name ?? "Unknown brand",
    [brands]
  );
  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? "Unknown project",
    [projects]
  );

  const monthEntries = useMemo(
    () => entries.filter((e) => e.entry_date.startsWith(monthPrefix)),
    [entries, monthPrefix]
  );
  const monthLeaves = useMemo(
    () => leaves.filter((l) => l.leave_date.startsWith(monthPrefix)),
    [leaves, monthPrefix]
  );

  const projectTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthEntries) {
      const task = tasksById[e.task_id];
      if (!task) continue;
      map[task.project_id] = (map[task.project_id] ?? 0) + e.hours;
    }
    return Object.entries(map)
      .map(([projectId, hours]) => ({ name: projectName(projectId), hours }))
      .sort((a, b) => b.hours - a.hours);
  }, [monthEntries, tasksById, projectName]);

  const brandHoursMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthEntries) {
      const task = tasksById[e.task_id];
      if (!task) continue;
      map[task.brand_id] = (map[task.brand_id] ?? 0) + e.hours;
    }
    return map;
  }, [monthEntries, tasksById]);

  const totalLeaveHours = useMemo(
    () => monthLeaves.reduce((sum, l) => sum + l.hours, 0),
    [monthLeaves]
  );
  const totalBrandHours = useMemo(
    () => Object.values(brandHoursMap).reduce((sum, h) => sum + h, 0),
    [brandHoursMap]
  );
  const benchHours = Math.max(0, teamTotalWorkingHours - totalBrandHours - totalLeaveHours);

  // Brand-level allocation: every brand + a Leave row + an auto-computed
  // Bench row (whatever's left of the team's working hours once real work
  // and leave are accounted for), all as a % of team total working hours.
  const brandAllocationRows = useMemo(() => {
    const rows = Object.entries(brandHoursMap)
      .map(([brandId, hours]) => ({ name: brandName(brandId), hours }))
      .sort((a, b) => b.hours - a.hours);
    rows.push({ name: "Leave", hours: totalLeaveHours });
    rows.push({ name: "Bench", hours: benchHours });
    return rows.map((r) => ({
      ...r,
      pct: teamTotalWorkingHours > 0 ? Math.round((r.hours / teamTotalWorkingHours) * 1000) / 10 : 0,
    }));
  }, [brandHoursMap, brandName, totalLeaveHours, benchHours, teamTotalWorkingHours]);

  const brandKeys = useMemo(() => brands.map((b) => b.name), [brands]);

  const employeeRows = useMemo(() => {
    return visibleProfiles.map((profile) => {
      const perBrand: Record<string, number> = {};
      let total = 0;
      for (const e of monthEntries) {
        const task = tasksById[e.task_id];
        if (!task || task.owner_id !== profile.id) continue;
        const name = brandName(task.brand_id);
        perBrand[name] = (perBrand[name] ?? 0) + e.hours;
        total += e.hours;
      }
      const leaveHours = monthLeaves
        .filter((l) => l.profile_id === profile.id)
        .reduce((sum, l) => sum + l.hours, 0);
      total += leaveHours;
      const workingHours = workingHoursByProfile[profile.id] ?? 0;
      const pct = workingHours > 0 ? Math.round((total / workingHours) * 1000) / 10 : 0;
      return {
        profile,
        perBrand,
        leaveHours,
        total,
        pct,
        workingHours,
        chartRow: {
          name: profile.full_name,
          Leave: leaveHours,
          ...perBrand,
        },
      };
    });
  }, [visibleProfiles, monthEntries, monthLeaves, tasksById, brandName, workingHoursByProfile]);

  // Employee x Project and Employee x Brand pivots — each employee's own
  // breakdown, not just the team-wide aggregates above.
  const employeeProjectHours = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const e of monthEntries) {
      const task = tasksById[e.task_id];
      if (!task) continue;
      const row = (map[task.owner_id] ??= {});
      row[task.project_id] = (row[task.project_id] ?? 0) + e.hours;
    }
    return map;
  }, [monthEntries, tasksById]);

  const employeeBrandHours = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const e of monthEntries) {
      const task = tasksById[e.task_id];
      if (!task) continue;
      const row = (map[task.owner_id] ??= {});
      row[task.brand_id] = (row[task.brand_id] ?? 0) + e.hours;
    }
    return map;
  }, [monthEntries, tasksById]);

  const projectColumns = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ id: p.id, name: p.name })),
    [projects]
  );
  const brandColumns = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ id: b.id, name: b.name })),
    [brands]
  );

  const employeeHolidayRows = useMemo(() => {
    return visibleProfiles.map((profile) => {
      const office = profile.office_id ? officesById[profile.office_id] : undefined;
      const holidaySet = (profile.office_id && holidaysByOffice[profile.office_id]) || new Set<string>();
      const datesThisMonth = holidays
        .filter((h) => h.office_id === profile.office_id && h.holiday_date.startsWith(monthPrefix))
        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
      return { profile, office, datesThisMonth, count: holidaySet.size };
    });
  }, [visibleProfiles, officesById, holidaysByOffice, holidays, monthPrefix]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Resource Allocation</h1>
          <p className="text-sm text-slate-400">
            Working hours, brand allocation %, and leave for the selected month.
          </p>
        </div>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Team working hours" value={`${teamTotalWorkingHours}h`} />
        <StatCard label="Logged + leave hours" value={`${totalBrandHours + totalLeaveHours}h`} />
        <StatCard label="Bench hours" value={`${benchHours}h`} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Project-wise allocation</h2>
        <TotalsTable rows={projectTotals} emptyLabel="No hours logged yet this month." />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Brand-wise allocation</h2>
        <p className="mb-4 text-xs text-slate-400">
          Every brand plus Leave, as a % of {teamTotalWorkingHours}h team working hours this
          month. Bench is auto-computed as whatever&apos;s left over — it isn&apos;t a real
          selectable brand.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Brand</th>
                <th className="px-3 py-2 text-right">Hours</th>
                <th className="px-3 py-2 text-right">% of month</th>
              </tr>
            </thead>
            <tbody>
              {brandAllocationRows.map((r) => (
                <tr
                  key={r.name}
                  className={`border-t border-slate-100 ${
                    r.name === "Bench" ? "text-slate-400" : "text-slate-700"
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right">{r.hours}</td>
                  <td className="px-3 py-2 text-right font-medium">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Per-employee breakdown</h2>
        <p className="mb-4 text-xs text-slate-400">
          Hours by brand plus leave, as a % of each person&apos;s own working hours this month
          (which depends on their office&apos;s holiday calendar).
        </p>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={employeeRows.map((r) => r.chartRow)} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Leave" stackId="a" fill={LEAVE_COLOR} />
              {brandKeys.map((name, i) => (
                <Bar key={name} dataKey={name} stackId="a" fill={PALETTE[i % PALETTE.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-right">Leave (h)</th>
                <th className="px-3 py-2 text-right">Total (h)</th>
                <th className="px-3 py-2 text-right">Working hours</th>
                <th className="px-3 py-2 text-right">% of month</th>
              </tr>
            </thead>
            <tbody>
              {employeeRows.map((row) => (
                <tr key={row.profile.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-700">{row.profile.full_name}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{row.leaveHours}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{row.total}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{row.workingHours}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-700">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EmployeeAllocationMatrix
        title="Employee-wise project allocation"
        description="Hours each employee logged per project this month."
        employees={visibleProfiles}
        columns={projectColumns}
        hoursByEmployeeAndColumn={employeeProjectHours}
      />

      <EmployeeAllocationMatrix
        title="Employee-wise brand allocation"
        description="Hours each employee logged per brand this month — scroll sideways if there are many brands."
        employees={visibleProfiles}
        columns={brandColumns}
        hoursByEmployeeAndColumn={employeeBrandHours}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Employee Holidays</h2>
        <p className="mb-4 text-xs text-slate-400">
          Auto-derived from each employee&apos;s office — no manual per-employee setup. Manage the
          underlying office holiday calendar from Admin.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Employee</th>
                <th className="px-3 py-2 text-left">Office</th>
                <th className="px-3 py-2 text-left">Holidays this month</th>
              </tr>
            </thead>
            <tbody>
              {employeeHolidayRows.map((row) => (
                <tr key={row.profile.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-700">{row.profile.full_name}</td>
                  <td className="px-3 py-2 text-slate-500">{row.office?.name ?? "Unassigned"}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {row.datesThisMonth.length === 0
                      ? "None"
                      : row.datesThisMonth.map((h) => `${h.holiday_date.slice(8)} (${h.label})`).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TotalsTable({
  rows,
  emptyLabel,
}: {
  rows: { name: string; hours: number }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.hours), 1);
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-slate-600">{r.name}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${(r.hours / max) * 100}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-sm font-medium text-slate-700">
            {r.hours}h
          </span>
        </div>
      ))}
    </div>
  );
}
