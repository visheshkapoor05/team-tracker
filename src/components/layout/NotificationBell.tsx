"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/store/types";
import { useOutsideClick } from "@/lib/use-outside-click";

const POLL_MS = 4000;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const seenIds = useRef<Set<string> | null>(null);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const { notifications: list } = (await res.json()) as { notifications: Notification[] };
      if (cancelled) return;

      if (seenIds.current === null) {
        seenIds.current = new Set(list.map((n) => n.id));
      } else {
        const fresh = list.find((n) => !seenIds.current!.has(n.id) && !n.is_read);
        if (fresh) setToast(fresh);
        seenIds.current = new Set(list.map((n) => n.id));
      }
      setNotifications(list);
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function openNotification(n: Notification) {
    await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    setOpen(false);
    setToast(null);
    if (n.task_id) {
      if (window.location.pathname === "/tracker") {
        window.dispatchEvent(new CustomEvent("open-task-comments", { detail: n.task_id }));
      } else {
        router.push(`/tracker?openTask=${n.task_id}`);
      }
    }
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Notifications
            </div>
            {notifications.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-400">
                Nothing here yet.
              </div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  n.is_read ? "text-slate-500" : "font-medium text-slate-800"
                }`}
              >
                {!n.is_read && (
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                )}
                {n.message}
                <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <button
          onClick={() => openNotification(toast)}
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-slate-200 bg-white p-4 text-left text-sm shadow-xl animate-[fadeIn_.2s_ease-out]"
        >
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-indigo-600">
            New notification
          </span>
          {toast.message}
        </button>
      )}
    </>
  );
}
