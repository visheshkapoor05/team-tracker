"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/store/types";
import { useOutsideClick } from "@/lib/use-outside-click";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadInitial() {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const { notifications: list } = (await res.json()) as { notifications: Notification[] };
      if (!cancelled) setNotifications(list);
    }
    loadInitial();

    // Realtime instead of polling: Postgres broadcasts new rows the moment
    // they're inserted (comment notifications, brand decisions, stale-task
    // reminders), scoped to this user by RLS + the filter below.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          setNotifications((prev) => [notification, ...prev]);
          setToast(notification);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface shadow-sm hover:bg-surface-2"
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
          <div className="absolute right-0 z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
            <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">
              Notifications
            </div>
            {notifications.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted">
                Nothing here yet.
              </div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                  n.is_read ? "text-muted" : "font-medium text-ink"
                }`}
              >
                {!n.is_read && (
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                )}
                {n.message}
                <span className="mt-0.5 block text-[11px] font-normal text-muted">
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
          className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-line bg-surface p-4 text-left text-sm shadow-xl animate-[fadeIn_.2s_ease-out]"
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
