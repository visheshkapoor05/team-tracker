"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Profile } from "@/lib/store/types";
import { useOutsideClick } from "@/lib/use-outside-click";

export function TrackerViewSelector({
  currentUser,
  profiles,
  viewingProfileId,
  onChange,
}: {
  currentUser: Profile;
  profiles: Profile[];
  viewingProfileId: string;
  onChange: (profileId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  // Leads can switch between employees/other leads but not into a manager's
  // tracker; managers can view anyone.
  const others = profiles.filter(
    (p) => p.id !== currentUser.id && (currentUser.role === "manager" || p.role !== "manager")
  );
  const viewingSelf = viewingProfileId === currentUser.id;
  const viewingProfile = profiles.find((p) => p.id === viewingProfileId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
      >
        Viewing:{" "}
        <span className="text-indigo-700">
          {viewingSelf ? "My tracker" : `${viewingProfile?.full_name ?? "Unknown"}'s tracker`}
        </span>
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 w-56 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg">
          <button
            onClick={() => {
              onChange(currentUser.id);
              setOpen(false);
            }}
            className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
              viewingSelf ? "bg-indigo-50 font-medium text-indigo-700" : "text-ink"
            }`}
          >
            My tracker
          </button>
          <div className="my-1 border-t border-line" />
          <div className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
            Team
          </div>
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                p.id === viewingProfileId ? "bg-indigo-50 font-medium text-indigo-700" : "text-ink"
              }`}
            >
              {p.full_name}
              <span className="ml-1.5 text-xs font-normal text-muted">({p.role})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
