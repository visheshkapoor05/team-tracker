export const META_COLUMNS = [
  { key: "task", label: "Project / Task", width: 260 },
  { key: "status", label: "Status", width: 130 },
  { key: "brand", label: "Brand", width: 170 },
  { key: "start", label: "Start Date", width: 110 },
  { key: "end", label: "End Date", width: 110 },
  { key: "comments", label: "Comments", width: 90 },
] as const;

export const META_TOTAL_WIDTH = META_COLUMNS.reduce((sum, c) => sum + c.width, 0);

/**
 * Precedence for date-column tinting: leave > holiday > weekend. The tracker
 * always shows one person's tasks at a time, so this is unambiguous whether
 * it's applied to a header cell, a project's aggregate band, or a task row.
 */
export function dayTintClass(d: { isLeave: boolean; isHoliday: boolean; isWeekend: boolean }): string {
  if (d.isLeave) return "cell-leave";
  if (d.isHoliday) return "cell-holiday";
  if (d.isWeekend) return "col-weekend";
  return "";
}
