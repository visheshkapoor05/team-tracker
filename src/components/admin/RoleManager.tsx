"use client";

import { useState } from "react";
import type { Office, Profile, Role } from "@/lib/store/types";

const ROLES: Role[] = ["employee", "lead", "manager"];

export function RoleManager({
  profiles,
  offices,
  currentUser,
  onChangeRole,
  onChangeOffice,
}: {
  profiles: Profile[];
  offices: Office[];
  currentUser: Profile;
  onChangeRole: (id: string, role: Role) => Promise<void>;
  onChangeOffice: (id: string, officeId: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRoleChange(id: string, role: Role) {
    setBusyId(id);
    await onChangeRole(id, role);
    setBusyId(null);
  }

  async function handleOfficeChange(id: string, officeId: string) {
    setBusyId(id);
    await onChangeOffice(id, officeId);
    setBusyId(null);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Team, Roles & Offices</h2>
      <p className="mb-4 text-xs text-slate-400">
        Employees only see their own tracker. Leads can view everyone (except managers) and
        comment on any task. Managers can edit everything and manage this page. Office
        assignment determines which holiday calendar applies to each person automatically.
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Office</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-700">
                  {p.full_name}
                  {p.id === currentUser.id && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500">{p.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.role}
                    disabled={busyId === p.id}
                    onChange={(e) => handleRoleChange(p.id, e.target.value as Role)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400 disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={p.office_id ?? ""}
                    disabled={busyId === p.id}
                    onChange={(e) => handleOfficeChange(p.id, e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400 disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Unassigned
                    </option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
