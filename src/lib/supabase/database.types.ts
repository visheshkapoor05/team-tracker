// Hand-authored to match supabase/migrations/*.sql. If you have the Supabase
// CLI linked to your project, prefer regenerating this with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
//
// Shape (Row/Insert/Update/Relationships per table, Views/Functions/Enums at
// the schema level) must match @supabase/postgrest-js's GenericSchema exactly
// or every query collapses to `never` — this isn't just documentation.

export interface Database {
  public: {
    Tables: {
      offices: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: "employee" | "lead" | "manager";
          office_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: "employee" | "lead" | "manager";
          office_id?: string | null;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string;
          role?: "employee" | "lead" | "manager";
          office_id?: string | null;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          name: string;
          status: "pending" | "approved" | "rejected";
          requested_by: string;
          approved_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: "pending" | "approved" | "rejected";
          requested_by: string;
          approved_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          status?: "pending" | "approved" | "rejected";
          approved_by?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          created_by: string;
          created_at?: string;
        };
        Update: { name?: string; start_date?: string; end_date?: string };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          name: string;
          status: "to_do" | "in_progress" | "hold" | "done";
          brand_id: string;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
          status_changed_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          name: string;
          status?: "to_do" | "in_progress" | "hold" | "done";
          brand_id: string;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
          status_changed_at?: string;
        };
        Update: {
          name?: string;
          status?: "to_do" | "in_progress" | "hold" | "done";
          brand_id?: string;
          start_date?: string | null;
          end_date?: string | null;
          updated_at?: string;
          status_changed_at?: string;
        };
        Relationships: [];
      };
      task_daily_entries: {
        Row: {
          id: string;
          task_id: string;
          entry_date: string;
          hours: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          entry_date: string;
          hours: number;
          created_at?: string;
        };
        Update: { hours?: number };
        Relationships: [];
      };
      leaves: {
        Row: { id: string; profile_id: string; leave_date: string; hours: number; created_at: string };
        Insert: {
          id?: string;
          profile_id: string;
          leave_date: string;
          hours?: number;
          created_at?: string;
        };
        Update: { hours?: number };
        Relationships: [];
      };
      holidays: {
        Row: {
          id: string;
          office_id: string;
          holiday_date: string;
          label: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          office_id: string;
          holiday_date: string;
          label: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: { label?: string };
        Relationships: [];
      };
      comments: {
        Row: { id: string; task_id: string; author_id: string; body: string; created_at: string };
        Insert: {
          id?: string;
          task_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: { body?: string };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          task_id: string | null;
          comment_id: string | null;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          task_id?: string | null;
          comment_id?: string | null;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: { is_read?: boolean };
        Relationships: [];
      };
      org_settings: {
        Row: { id: string; stale_task_reminder_days: number };
        Insert: { id?: string; stale_task_reminder_days?: number };
        Update: { stale_task_reminder_days?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
