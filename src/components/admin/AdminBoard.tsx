"use client";

import { useMemo, useState } from "react";
import type { Brand, Holiday, Office, OrgSettings, Profile, Role } from "@/lib/store/types";
import { RoleManager } from "./RoleManager";
import { BrandApprovalQueue } from "./BrandApprovalQueue";
import { BrandRegistry } from "./BrandRegistry";
import { HolidayManager } from "./HolidayManager";
import { ReminderSettings } from "./ReminderSettings";

export function AdminBoard({
  currentUser,
  initialProfiles,
  initialBrands,
  initialHolidays,
  initialOffices,
  initialOrgSettings,
}: {
  currentUser: Profile;
  initialProfiles: Profile[];
  initialBrands: Brand[];
  initialHolidays: Holiday[];
  initialOffices: Office[];
  initialOrgSettings: OrgSettings;
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [brands, setBrands] = useState(initialBrands);
  const [holidays, setHolidays] = useState(initialHolidays);
  const [offices] = useState(initialOffices);
  const [orgSettings, setOrgSettings] = useState(initialOrgSettings);

  const profilesById = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  async function changeRole(id: string, role: Role) {
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not update role");
      return;
    }
    const { profile } = await res.json();
    setProfiles((prev) => prev.map((p) => (p.id === id ? profile : p)));
  }

  async function changeOffice(id: string, officeId: string) {
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ office_id: officeId }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not update office");
      return;
    }
    const { profile } = await res.json();
    setProfiles((prev) => prev.map((p) => (p.id === id ? profile : p)));
  }

  async function decideBrand(id: string, decision: { status: "approved" | "rejected"; name?: string }) {
    const res = await fetch(`/api/brands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error ?? "Could not update brand");
      return;
    }
    const { brand } = await res.json();
    setBrands((prev) => prev.map((b) => (b.id === id ? brand : b)));
  }

  async function renameBrand(id: string, name: string) {
    const res = await fetch(`/api/brands/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Could not rename brand");
    }
    const { brand } = await res.json();
    setBrands((prev) => prev.map((b) => (b.id === id ? brand : b)));
  }

  async function deleteBrand(id: string) {
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Could not delete brand");
    }
    setBrands((prev) => prev.filter((b) => b.id !== id));
  }

  async function addBrand(name: string) {
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Could not add brand");
    }
    const { brand } = await res.json();
    setBrands((prev) => [...prev, brand]);
  }

  async function addHoliday(input: { office_id: string; holiday_date: string; label: string }) {
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Could not add holiday");
    }
    const { holiday } = await res.json();
    setHolidays((prev) => [...prev, holiday]);
  }

  async function removeHoliday(id: string) {
    await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  }

  async function saveReminderDays(days: number) {
    const res = await fetch("/api/org-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stale_task_reminder_days: days }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Could not save setting");
    }
    const { settings } = await res.json();
    setOrgSettings(settings);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Admin</h1>
        <p className="text-sm text-muted">
          Manager-only tools for roles, offices, brands, holidays, and reminders.
        </p>
      </div>
      <RoleManager
        profiles={profiles}
        offices={offices}
        currentUser={currentUser}
        onChangeRole={changeRole}
        onChangeOffice={changeOffice}
      />
      <BrandApprovalQueue brands={brands} profilesById={profilesById} onDecide={decideBrand} />
      <BrandRegistry brands={brands} onRename={renameBrand} onDelete={deleteBrand} onAdd={addBrand} />
      <HolidayManager
        holidays={holidays}
        offices={offices}
        onAdd={addHoliday}
        onRemove={removeHoliday}
      />
      <ReminderSettings settings={orgSettings} onSave={saveReminderDays} />
    </div>
  );
}
