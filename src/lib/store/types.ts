export type Role = "employee" | "lead" | "manager";

export type TaskStatus = "to_do" | "in_progress" | "hold" | "done";

export type BrandStatus = "pending" | "approved" | "rejected";

export interface Office {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  office_id: string | null;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  status: BrandStatus;
  requested_by: string;
  approved_by: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  status: TaskStatus;
  brand_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  status_changed_at: string;
}

export interface TaskDailyEntry {
  id: string;
  task_id: string;
  entry_date: string;
  hours: number;
  created_at: string;
}

export interface Leave {
  id: string;
  profile_id: string;
  leave_date: string;
  hours: number;
  created_at: string;
}

export interface Holiday {
  id: string;
  office_id: string;
  holiday_date: string;
  label: string;
  created_by: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  task_id: string | null;
  comment_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface OrgSettings {
  id: string;
  stale_task_reminder_days: number;
}

export interface Database {
  profiles: Profile[];
  brands: Brand[];
  projects: Project[];
  tasks: Task[];
  task_daily_entries: TaskDailyEntry[];
  leaves: Leave[];
  holidays: Holiday[];
  comments: Comment[];
  notifications: Notification[];
  offices: Office[];
  org_settings: OrgSettings[];
}

export const TASK_STATUSES: { value: TaskStatus; label: string; dot: string }[] = [
  { value: "to_do", label: "To do", dot: "#9CA3AF" },
  { value: "in_progress", label: "In progress", dot: "#F59E0B" },
  { value: "hold", label: "Hold", dot: "#EF4444" },
  { value: "done", label: "Done", dot: "#22C55E" },
];
