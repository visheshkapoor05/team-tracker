"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/store/types";
import { useOutsideClick } from "@/lib/use-outside-click";

const ROLE_LABEL: Record<Profile["role"], string> = {
  employee: "Employee",
  lead: "Lead",
  manager: "Manager",
};

export function UserMenu({ currentUser }: { currentUser: Profile }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useOutsideClick(ref, () => setOpen(false));

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          {currentUser.full_name.charAt(0)}
        </span>
        <span className="font-medium">{currentUser.full_name}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {ROLE_LABEL[currentUser.role]}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-1.5 text-xs text-slate-400">{currentUser.email}</div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
