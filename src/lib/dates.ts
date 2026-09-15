export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function dateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * Formats a Date using its local y/m/d, not Date#toISOString (which converts
 * to UTC first and silently shifts the date for any timezone ahead of UTC,
 * e.g. IST). Use this everywhere a "YYYY-MM-DD" is derived from a local Date.
 */
export function toDateKey(date: Date): string {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function todayKey(): string {
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

export function workingDaysInMonth(
  year: number,
  month: number,
  holidayDates: Set<string>
): number {
  const total = daysInMonth(year, month);
  let count = 0;
  for (let day = 1; day <= total; day++) {
    if (isWeekend(year, month, day)) continue;
    if (holidayDates.has(dateKey(year, month, day))) continue;
    count++;
  }
  return count;
}
