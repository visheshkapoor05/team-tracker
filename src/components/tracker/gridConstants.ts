export const META_COLUMNS = [
  { key: "task", label: "Project / Task", width: 260 },
  { key: "status", label: "Status", width: 130 },
  { key: "brand", label: "Brand", width: 170 },
  { key: "start", label: "Start Date", width: 110 },
  { key: "end", label: "End Date", width: 110 },
  { key: "comments", label: "Comments", width: 90 },
] as const;

export const META_TOTAL_WIDTH = META_COLUMNS.reduce((sum, c) => sum + c.width, 0);
