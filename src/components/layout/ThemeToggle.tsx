"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  // Read the attribute the bootstrap script already set, rather than
  // defaulting to "light" and risking a mismatched first render.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Reads state set by the inline bootstrap script in <head>, which runs
    // before hydration — this can't be known at SSR time, so syncing it in
    // an effect (rather than a lazy initializer) is what avoids a
    // server/client hydration mismatch.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      disabled={theme === null}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-150 hover:text-ink active:scale-90 disabled:opacity-0"
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
