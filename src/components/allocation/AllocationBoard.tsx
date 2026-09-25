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

type AllocationSummary = {
  totalWorkingHours: number;
  projectTotals: { name: string; hours: number }[];
  brandAllocationRows: { name: string; hours: number; pct: number }[];
  totalBrandHours: number;
  totalLeaveHours: number;
  benchHours: number;
};

function summarizeAllocation({
  profileIds,
  monthEntries,
  monthLeaves,
  tasksById,
  workingHoursByProfile,
  brandName,
  projectName,
}: {
  profileIds: Set<string>;
  monthEntries: TaskDailyEntry[];
  monthLeaves: Leave[];
  tasksById: Record<string, Task>;
  workingHoursByProfile: Record<string, number>;
  brandName: (id: string) => string;
  projectName: (id: string) => string;
}): AllocationSummary {
  const relevantEntries = monthEntries.filter((e) => {
    const task = tasksById[e.task_id];
    return task && profileIds.has(task.owner_id);
  });
  const relevantLeaves = monthLeaves.filter((l) => profileIds.has(l.profile_id));

  const totalWorkingHours = Array.from(profileIds).reduce(
    (sum, id) => sum + (workingHoursByProfile[id] ?? 0),
    0
  );

  const projectMap: Record<string, number> = {};
  const brandHoursMap: Record<string, number> = {};
  for (const e of relevantEntries) {
    const task = tasksById[e.task_id];
    if (!task) continue;
    projectMap[task.project_id] = (projectMap[task.project_id] ?? 0) + e.hours;
    brandHoursMap[task.brand_id] = (brandHoursMap[task.brand_id] ?? 0) + e.hours;
  }
  const projectTotals = Object.entries(projectMap)
    .map(([id, hours]) => ({ name: projectName(id), hours }))
    .sort((a, b) => b.hours - a.hours);

  const totalLeaveHours = relevantLeaves.reduce((sum, l) => sum + l.hours, 0);
  const totalBrandHours = Object.values(brandHoursMap).reduce((sum, h) => sum + h, 0);
  const benchHours = Math.max(0, totalWorkingHours - totalBrandHours - totalLeaveHours);

  const brandRows = Object.entries(brandHoursMap)
    .map(([id, hours]) => ({ name: brandName(id), hours }))
    .sort((a, b) => b.hours - a.hours);
  brandRows.push({ name: "Leave", hours: totalLeaveHours });
  brandRows.push({ name: "Bench", hours: benchHours });
  const brandAllocationRows = brandRows.map((r) => ({
    ...r,
    pct: totalWorkingHours > 0 ? Math.round((r.hours / totalWorkingHours) * 1000) / 10 : 0,
  }));

  return { totalWorkingHours, projectTotals, brandAllocationRows, totalBrandHours, totalLeaveHours, benchHours };
}

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

  // Managers and leads additionally get a team-wide view below their own —
  // everyone else only ever sees their own personal dashboard.
  const canViewAll = currentUser.role === "manager" || currentUser.role === "lead";

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
    for (const p of profiles) {
      const holidaySet = (p.office_id && holidaysByOffice[p.office_id]) || new Set<string>();
      map[p.id] = workingDaysInMonth(year, month, holidaySet) * 8;
    }
    return map;
  }, [profiles, holidaysByOffice, year, month]);

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

  // My own allocation — always self-scoped, for every role.
  const selfSummary = useMemo(
    () =>
      summarizeAllocation({
        profileIds: new Set([currentUser.id]),
        monthEntries,
        monthLeaves,
        tasksById,
        workingHoursByProfile,
        brandName,
        projectName,
      }),
    [currentUser.id, monthEntries, monthLeaves, tasksById, workingHoursByProfile, brandName, projectName]
  );

  // Whole-team allocation — only computed/shown for managers and leads.
  const teamSummary = useMemo(
    () =>
      canViewAll
        ? summarizeAllocation({
            profileIds: new Set(profiles.map((p) => p.id)),
            monthEntries,
            monthLeaves,
            tasksById,
            workingHoursByProfile,
            brandName,
            projectName,
          })
        : null,
    [canViewAll, profiles, monthEntries, monthLeaves, tasksById, workingHoursByProfile, brandName, projectName]
  );

  // Each employee's own brand-allocation table (same shape as "My brand-wise
  // allocation" above), for the manager/lead team view.
  const perEmployeeBrandSummaries = useMemo(
    () =>
      canViewAll
        ? profiles.map((profile) => ({
            profile,
            summary: summarizeAllocation({
              profileIds: new Set([profile.id]),
              monthEntries,
              monthLeaves,
              tasksById,
              workingHoursByProfile,
              brandName,
              projectName,
            }),
          }))
        : [],
    [canViewAll, profiles, monthEntries, monthLeaves, tasksById, workingHoursByProfile, brandName, projectName]
  );

  const brandKeys = useMemo(() => brands.map((b) => b.name), [brands]);

  const employeeRows = useMemo(() => {
    return profiles.map((profile) => {
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
  }, [profiles, monthEntries, monthLeaves, tasksById, brandName, workingHoursByProfile]);

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
    return profiles.map((profile) => {
      const office = profile.office_id ? officesById[profile.office_id] : undefined;
      const holidaySet = (profile.office_id && holidaysByOffice[profile.office_id]) || new Set<string>();
      const datesThisMonth = holidays
        .filter((h) => h.office_id === profile.office_id && h.holiday_date.startsWith(monthPrefix))
        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
      return { profile, office, datesThisMonth, count: holidaySet.size };
    });
  }, [profiles, officesById, holidaysByOffice, holidays, monthPrefix]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Resource Allocation</h1>
          <p className="text-sm text-muted">
            Working hours, brand allocation %, and leave for the selected month.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-surface-2"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-ink">
            {monthLabel(year, month)}
          </span>
          <button
            onClick={() => goToMonth(1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line hover:bg-surface-2"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          My allocation
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="My working hours" value={`${selfSummary.totalWorkingHours}h`} />
          <StatCard
            label="My logged + leave hours"
            value={`${selfSummary.totalBrandHours + selfSummary.totalLeaveHours}h`}
          />
          <StatCard label="My bench hours" value={`${selfSummary.benchHours}h`} />
        </div>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">My project-wise allocation</h2>
        <TotalsTable rows={selfSummary.projectTotals} emptyLabel="No hours logged yet this month." />
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-sm font-semibold text-ink">My brand-wise allocation</h2>
        <p className="mb-4 text-xs text-muted">
          Every brand plus Leave, as a % of your {selfSummary.totalWorkingHours}h working hours
          this month. Bench is auto-computed as whatever&apos;s left over — it isn&apos;t a real
          selectable brand.
        </p>
        <AllocationTable rows={selfSummary.brandAllocationRows} />
      </section>

      {canViewAll && teamSummary && (
        <>
          <div className="mt-2 border-t border-line pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Team overview (all employees)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Team working hours" value={`${teamSummary.totalWorkingHours}h`} />
            <StatCard
              label="Logged + leave hours"
              value={`${teamSummary.totalBrandHours + teamSummary.totalLeaveHours}h`}
            />
            <StatCard label="Bench hours" value={`${teamSummary.benchHours}h`} />
          </div>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink">Project-wise allocation</h2>
            <TotalsTable rows={teamSummary.projectTotals} emptyLabel="No hours logged yet this month." />
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink">Brand-wise allocation</h2>
            <p className="mb-4 text-xs text-muted">
              Every brand plus Leave, as a % of {teamSummary.totalWorkingHours}h team working
              hours this month. Bench is auto-computed as whatever&apos;s left over — it
              isn&apos;t a real selectable brand.
            </p>
            <AllocationTable rows={teamSummary.brandAllocationRows} />
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink">Per-employee breakdown</h2>
            <p className="mb-4 text-xs text-muted">
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

            <div className="mt-4 overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
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
                    <tr key={row.profile.id} className="border-t border-line">
                      <td className="px-3 py-2 font-medium text-ink">{row.profile.full_name}</td>
                      <td className="px-3 py-2 text-right text-muted">{row.leaveHours}</td>
                      <td className="px-3 py-2 text-right text-muted">{row.total}</td>
                      <td className="px-3 py-2 text-right text-muted">{row.workingHours}</td>
                      <td className="px-3 py-2 text-right font-medium text-ink">{row.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <EmployeeAllocationMatrix
            title="Employee-wise project allocation"
            description="Hours each employee logged per project this month."
            employees={profiles}
            columns={projectColumns}
            hoursByEmployeeAndColumn={employeeProjectHours}
          />

          <EmployeeAllocationMatrix
            title="Employee-wise brand allocation"
            description="Hours each employee logged per brand this month — scroll sideways if there are many brands."
            employees={profiles}
            columns={brandColumns}
            hoursByEmployeeAndColumn={employeeBrandHours}
          />

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink">Brand allocation % — all employees</h2>
            <p className="mb-4 text-xs text-muted">
              Every employee&apos;s own brand-wise allocation table (same as &quot;My brand-wise
              allocation&quot; above), stacked so you can scroll through the whole team.
            </p>
            <div className="max-h-[560px] space-y-5 overflow-y-auto pr-1">
              {perEmployeeBrandSummaries.map(({ profile, summary }) => (
                <div key={profile.id}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {profile.full_name} · {summary.totalWorkingHours}h working hours
                  </h3>
                  <AllocationTable rows={summary.brandAllocationRows} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink">Employee Holidays</h2>
            <p className="mb-4 text-xs text-muted">
              Auto-derived from each employee&apos;s office — no manual per-employee setup. Manage
              the underlying office holiday calendar from Admin.
            </p>
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-left">Office</th>
                    <th className="px-3 py-2 text-left">Holidays this month</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeHolidayRows.map((row) => (
                    <tr key={row.profile.id} className="border-t border-line">
                      <td className="px-3 py-2 font-medium text-ink">{row.profile.full_name}</td>
                      <td className="px-3 py-2 text-muted">{row.office?.name ?? "Unassigned"}</td>
                      <td className="px-3 py-2 text-muted">
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
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-ink">{value}</p>
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
    return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.hours), 1);
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-ink-soft" title={r.name}>
            {r.name}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-indigo-500 transition-[width] duration-700 ease-out"
              style={{ width: `${(r.hours / max) * 100}%` }}
            />
          </div>
          <span className="tabular w-14 shrink-0 text-right text-sm font-medium text-ink">
            {r.hours}h
          </span>
        </div>
      ))}
    </div>
  );
}

function AllocationTable({ rows }: { rows: { name: string; hours: number; pct: number }[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 text-left">Brand</th>
            <th className="px-3 py-2 text-right">Hours</th>
            <th className="px-3 py-2 text-right">% of month</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.name}
              className={`border-t border-line transition-colors duration-150 hover:bg-surface-2 ${
                r.name === "Bench" ? "text-muted" : "text-ink"
              }`}
            >
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="tabular px-3 py-2 text-right">{r.hours}</td>
              <td className="tabular px-3 py-2 text-right font-medium">{r.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
