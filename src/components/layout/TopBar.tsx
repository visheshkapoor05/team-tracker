"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/store/types";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ currentUser }: { currentUser: Profile }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/tracker", label: "Tracker" },
    { href: "/allocation", label: "Resource Allocation" },
    ...(currentUser.role === "manager" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">Team Tracker</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell userId={currentUser.id} />
          <UserMenu currentUser={currentUser} />
        </div>
      </div>
      <nav className="flex gap-1 px-6">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "border-b-2 border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
