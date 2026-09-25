"use client";

import { useState } from "react";
import type { Brand, Profile } from "@/lib/store/types";

export function BrandApprovalQueue({
  brands,
  profilesById,
  onDecide,
}: {
  brands: Brand[];
  profilesById: Record<string, Profile>;
  onDecide: (id: string, decision: { status: "approved" | "rejected"; name?: string }) => Promise<void>;
}) {
  const pending = brands.filter((b) => b.status === "pending");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, status: "approved" | "rejected", useEditedName: boolean) {
    setBusyId(id);
    await onDecide(id, { status, name: useEditedName ? edits[id] : undefined });
    setBusyId(null);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="mb-1 text-sm font-semibold text-ink">Brand Approval Queue</h2>
      <p className="mb-4 text-xs text-muted">
        Requests raised from the tracker&apos;s brand dropdown land here.
      </p>
      {pending.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No pending brand requests.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-2 p-3"
            >
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium text-ink">{b.name}</p>
                <p className="text-xs text-muted">
                  Requested by {profilesById[b.requested_by]?.full_name ?? "Unknown"} ·{" "}
                  {new Date(b.created_at).toLocaleDateString()}
                </p>
              </div>
              <input
                placeholder="Edit name (optional)"
                value={edits[b.id] ?? ""}
                onChange={(e) => setEdits((prev) => ({ ...prev, [b.id]: e.target.value }))}
                className="w-44 rounded-md border border-line px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
              />
              <button
                disabled={busyId === b.id}
                onClick={() => decide(b.id, "approved", Boolean(edits[b.id]?.trim()))}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve{edits[b.id]?.trim() ? " (edited)" : ""}
              </button>
              <button
                disabled={busyId === b.id}
                onClick={() => decide(b.id, "rejected", false)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
