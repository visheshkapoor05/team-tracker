"use client";

import { useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Brand } from "@/lib/store/types";

const STATUS_STYLE: Record<Brand["status"], string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

export function BrandRegistry({
  brands,
  onRename,
  onDelete,
  onAdd,
}: {
  brands: Brand[];
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: (name: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);

  const sorted = [...brands].sort((a, b) => a.name.localeCompare(b.name));

  function startEdit(brand: Brand) {
    setEditingId(brand.id);
    setEditValue(brand.name);
    setError(null);
  }

  async function saveEdit(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await onRename(id, editValue);
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rename brand");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await onDelete(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete brand");
    } finally {
      setBusyId(null);
    }
  }

  async function addNew() {
    if (!newName.trim() || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    setError(null);
    try {
      await onAdd(newName);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add brand");
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-800">Brand Registry</h2>
      <p className="mb-4 text-xs text-slate-400">
        Every brand in the system, regardless of status. Rename, delete (only if unused by any
        task), or add a brand directly — no approval needed for brands you add here yourself.
      </p>
      <div className="mb-4 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNew()}
          placeholder="New brand name"
          className="max-w-xs flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={addNew}
          disabled={adding || !newName.trim()}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={14} /> Add brand
        </button>
      </div>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-700">
                  {editingId === b.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(b.id)}
                      className="w-full rounded-md border border-indigo-300 px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    b.name
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  {editingId === b.id ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => saveEdit(b.id)}
                        disabled={busyId === b.id}
                        className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => startEdit(b)}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(b.id)}
                        disabled={busyId === b.id}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                  No brands yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
