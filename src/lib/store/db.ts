import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { toDateKey } from "../dates";
import type { Database } from "../supabase/database.types";
import type {
  Profile,
  Brand,
  Project,
  Task,
  TaskDailyEntry,
  Leave,
  Holiday,
  Comment,
  Notification,
  Office,
  OrgSettings,
  Role,
  TaskStatus,
} from "./types";
import { TASK_STATUSES } from "./types";

type BrandUpdate = Database["public"]["Tables"]["brands"]["Update"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export class ForbiddenError extends Error {
  status = 403;
}

function isManager(profile: Pick<Profile, "role">) {
  return profile.role === "manager";
}

function canViewAll(profile: Pick<Profile, "role">) {
  return profile.role === "manager" || profile.role === "lead";
}

function canComment(profile: Pick<Profile, "role">) {
  return profile.role === "manager" || profile.role === "lead";
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// .single() types its result as nullable even though PostgREST guarantees a
// row whenever `error` is null — this narrows that back for callers.
function single<T>(data: T | null, error: { message: string } | null): T {
  throwIfError(error);
  return data as T;
}

const STATUS_LABELS: Record<TaskStatus, string> = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s.label])
) as Record<TaskStatus, string>;

// ---------- Profiles ----------

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  throwIfError(error);
  return data ?? [];
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

export async function updateProfileRole(
  actingUser: Profile,
  targetId: string,
  role: Role
): Promise<Profile> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can change roles");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetId)
    .select()
    .single();
  return single(data, error);
}

export async function updateProfileOffice(
  actingUser: Profile,
  targetId: string,
  officeId: string
): Promise<Profile> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can assign offices");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ office_id: officeId })
    .eq("id", targetId)
    .select()
    .single();
  return single(data, error);
}

// ---------- Offices ----------

export async function listOffices(): Promise<Office[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("offices").select("*").order("name");
  throwIfError(error);
  return data ?? [];
}

// ---------- Brands ----------

export async function listBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("*").order("created_at");
  throwIfError(error);
  return data ?? [];
}

// Belt-and-suspenders against double-submits (slow network + no visible
// loading state can make an impatient user click twice for real, seconds
// apart — this isn't just a sub-millisecond race). If the same person just
// created a brand with this exact name, reuse it instead of inserting again.
async function findRecentDuplicateBrand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  requestedBy: string
): Promise<Brand | null> {
  const cutoff = new Date(Date.now() - 15_000).toISOString();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("requested_by", requestedBy)
    .ilike("name", name)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function requestBrand(actingUser: Profile, name: string): Promise<Brand> {
  const trimmedName = name.trim();
  const supabase = await createClient();
  const duplicate = await findRecentDuplicateBrand(supabase, trimmedName, actingUser.id);
  if (duplicate) return duplicate;

  const { data, error } = await supabase
    .from("brands")
    .insert({ name: trimmedName, status: "pending", requested_by: actingUser.id })
    .select()
    .single();
  const brand = single(data, error);

  const admin = createAdminClient();
  const { data: managers } = await admin.from("profiles").select("id").eq("role", "manager");
  if (managers && managers.length > 0) {
    await admin.from("notifications").insert(
      managers.map((m) => ({
        recipient_id: m.id,
        message: `${actingUser.full_name} requested a new brand: "${brand.name}"`,
      }))
    );
  }
  return brand;
}

export async function decideBrand(
  actingUser: Profile,
  brandId: string,
  decision: { status: "approved" | "rejected"; name?: string }
): Promise<Brand> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can decide on brands");
  const supabase = await createClient();
  const update: BrandUpdate = { status: decision.status, approved_by: actingUser.id };
  if (decision.name) update.name = decision.name.trim();
  const { data, error } = await supabase
    .from("brands")
    .update(update)
    .eq("id", brandId)
    .select()
    .single();
  const brand = single(data, error);

  const admin = createAdminClient();
  await admin.from("notifications").insert({
    recipient_id: brand.requested_by,
    message:
      decision.status === "approved"
        ? `Your brand request "${brand.name}" was approved.`
        : `Your brand request "${brand.name}" was rejected. Please choose another brand for any tasks using it.`,
  });
  return brand;
}

export async function renameBrand(actingUser: Profile, id: string, name: string): Promise<Brand> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can edit brands");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Brand name is required");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .update({ name: trimmed })
    .eq("id", id)
    .select()
    .single();
  return single(data, error);
}

export async function deleteBrand(actingUser: Profile, id: string): Promise<void> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can delete brands");
  const supabase = await createClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("This brand is used by existing tasks and can't be deleted");
    }
    throw new Error(error.message);
  }
}

export async function addApprovedBrand(actingUser: Profile, name: string): Promise<Brand> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can add brands directly");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Brand name is required");
  const supabase = await createClient();
  const duplicate = await findRecentDuplicateBrand(supabase, trimmed, actingUser.id);
  if (duplicate) return duplicate;

  const { data, error } = await supabase
    .from("brands")
    .insert({ name: trimmed, status: "approved", requested_by: actingUser.id, approved_by: actingUser.id })
    .select()
    .single();
  return single(data, error);
}

// ---------- Holidays (per office) ----------

export async function listHolidays(): Promise<Holiday[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("holidays").select("*");
  throwIfError(error);
  return data ?? [];
}

export async function addHoliday(
  actingUser: Profile,
  input: { office_id: string; holiday_date: string; label: string }
): Promise<Holiday> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can manage holidays");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holidays")
    .insert({
      office_id: input.office_id,
      holiday_date: input.holiday_date,
      label: input.label.trim() || "Holiday",
      created_by: actingUser.id,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Holiday already exists for this office and date");
    throw new Error(error.message);
  }
  return data;
}

export async function removeHoliday(actingUser: Profile, id: string): Promise<void> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can manage holidays");
  const supabase = await createClient();
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  throwIfError(error);
}

// ---------- Org settings ----------

export async function getOrgSettings(): Promise<OrgSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("org_settings").select("*").limit(1).maybeSingle();
  return data ?? { id: "default", stale_task_reminder_days: 10 };
}

export async function updateStaleTaskReminderDays(
  actingUser: Profile,
  days: number
): Promise<OrgSettings> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can change this setting");
  if (!Number.isFinite(days) || days < 1) throw new Error("Enter a valid number of days");
  const supabase = await createClient();
  const rounded = Math.round(days);
  const { data: existing } = await supabase.from("org_settings").select("id").limit(1).maybeSingle();

  if (!existing) {
    const { data, error } = await supabase
      .from("org_settings")
      .insert({ stale_task_reminder_days: rounded })
      .select()
      .single();
    return single(data, error);
  }

  const { data, error } = await supabase
    .from("org_settings")
    .update({ stale_task_reminder_days: rounded })
    .eq("id", existing.id)
    .select()
    .single();
  return single(data, error);
}

// ---------- Projects ----------

export async function listProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function createProject(
  actingUser: Profile,
  input: { name: string; start_date: string; end_date: string }
): Promise<Project> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      created_by: actingUser.id,
    })
    .select()
    .single();
  return single(data, error);
}

export async function updateProject(
  actingUser: Profile,
  id: string,
  patch: Partial<Pick<Project, "name" | "start_date" | "end_date">>
): Promise<Project> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can edit projects");
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update(patch).eq("id", id).select().single();
  return single(data, error);
}

export async function deleteProject(actingUser: Profile, id: string): Promise<void> {
  if (!isManager(actingUser)) throw new ForbiddenError("Only managers can delete projects");
  const supabase = await createClient();
  // Tasks (and in turn their entries/comments) cascade via FK on delete.
  const { error } = await supabase.from("projects").delete().eq("id", id);
  throwIfError(error);
}

// ---------- Tasks ----------

function assertCanEditTask(actingUser: Profile, task: Pick<Task, "owner_id">) {
  if (task.owner_id === actingUser.id) return;
  if (isManager(actingUser)) return;
  throw new ForbiddenError("Not authorized to edit this task");
}

export async function listVisibleTasks(actingUser: Profile): Promise<Task[]> {
  const supabase = await createClient();
  let query = supabase.from("tasks").select("*");
  if (!canViewAll(actingUser)) query = query.eq("owner_id", actingUser.id);
  const { data, error } = await query.order("created_at");
  throwIfError(error);
  return data ?? [];
}

export async function createTask(
  actingUser: Profile,
  input: {
    project_id: string;
    owner_id?: string;
    name: string;
    brand_id: string;
    status?: TaskStatus;
  }
): Promise<Task> {
  const ownerId = input.owner_id ?? actingUser.id;
  if (ownerId !== actingUser.id && !isManager(actingUser)) {
    throw new ForbiddenError("Only managers can create tasks for other people");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.project_id,
      owner_id: ownerId,
      name: input.name.trim(),
      status: input.status ?? "to_do",
      brand_id: input.brand_id,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23503") {
      throw new Error("A brand (approved or pending) is required to create a task");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function updateTask(
  actingUser: Profile,
  id: string,
  patch: Partial<Pick<Task, "name" | "status" | "brand_id" | "start_date" | "end_date">>
): Promise<Task> {
  const supabase = await createClient();
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(fetchError);
  if (!task) throw new Error("Task not found");
  assertCanEditTask(actingUser, task);

  const today = toDateKey(new Date());
  const finalPatch: TaskUpdate = { ...patch };
  if (patch.status === "in_progress" && !task.start_date && patch.start_date === undefined) {
    finalPatch.start_date = today;
  }
  if (patch.status === "done" && !task.end_date && patch.end_date === undefined) {
    finalPatch.end_date = today;
  }

  const statusChanged = patch.status !== undefined && patch.status !== task.status;
  finalPatch.updated_at = new Date().toISOString();
  if (statusChanged) finalPatch.status_changed_at = new Date().toISOString();

  const { data, error } = await supabase.from("tasks").update(finalPatch).eq("id", id).select().single();
  return single(data, error);
}

export async function deleteTask(actingUser: Profile, id: string): Promise<void> {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("owner_id").eq("id", id).maybeSingle();
  if (!task) return;
  assertCanEditTask(actingUser, task);
  // Entries/comments cascade via FK on delete.
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  throwIfError(error);
}

// ---------- Task daily entries (hours) ----------

export async function listEntriesForTasks(taskIds: string[]): Promise<TaskDailyEntry[]> {
  if (taskIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("task_daily_entries").select("*").in("task_id", taskIds);
  throwIfError(error);
  return data ?? [];
}

export async function setTaskHours(
  actingUser: Profile,
  taskId: string,
  entryDate: string,
  hours: number
): Promise<TaskDailyEntry | null> {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("owner_id").eq("id", taskId).maybeSingle();
  if (!task) throw new Error("Task not found");
  assertCanEditTask(actingUser, task);

  const { data: leave } = await supabase
    .from("leaves")
    .select("id")
    .eq("profile_id", task.owner_id)
    .eq("leave_date", entryDate)
    .maybeSingle();
  if (leave) {
    throw new Error("This date is marked as leave for this person and can't be logged against");
  }

  if (hours <= 0) {
    await supabase
      .from("task_daily_entries")
      .delete()
      .eq("task_id", taskId)
      .eq("entry_date", entryDate);
    return null;
  }

  const { data, error } = await supabase
    .from("task_daily_entries")
    .upsert({ task_id: taskId, entry_date: entryDate, hours }, { onConflict: "task_id,entry_date" })
    .select()
    .single();
  throwIfError(error);
  return data;
}

// ---------- Leaves ----------

export async function listLeaves(): Promise<Leave[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leaves").select("*");
  throwIfError(error);
  return data ?? [];
}

export async function toggleLeave(
  actingUser: Profile,
  profileId: string,
  leaveDate: string
): Promise<{ marked: boolean }> {
  if (profileId !== actingUser.id && !isManager(actingUser)) {
    throw new ForbiddenError("Not authorized to mark leave for this person");
  }
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("leaves")
    .select("id")
    .eq("profile_id", profileId)
    .eq("leave_date", leaveDate)
    .maybeSingle();

  if (existing) {
    await supabase.from("leaves").delete().eq("id", existing.id);
    return { marked: false };
  }

  const { error } = await supabase
    .from("leaves")
    .insert({ profile_id: profileId, leave_date: leaveDate, hours: 8 });
  throwIfError(error);

  const { data: ownedTasks } = await supabase.from("tasks").select("id").eq("owner_id", profileId);
  const ownedTaskIds = (ownedTasks ?? []).map((t) => t.id);
  if (ownedTaskIds.length > 0) {
    await supabase
      .from("task_daily_entries")
      .delete()
      .eq("entry_date", leaveDate)
      .in("task_id", ownedTaskIds);
  }
  return { marked: true };
}

// ---------- Comments ----------

export async function listComments(taskId: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at");
  throwIfError(error);
  return data ?? [];
}

export async function listCommentCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("comments").select("task_id");
  throwIfError(error);
  const counts: Record<string, number> = {};
  for (const c of data ?? []) counts[c.task_id] = (counts[c.task_id] ?? 0) + 1;
  return counts;
}

export async function addComment(
  actingUser: Profile,
  taskId: string,
  body: string
): Promise<Comment> {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) throw new Error("Task not found");
  const allowed = task.owner_id === actingUser.id || canComment(actingUser);
  if (!allowed) throw new ForbiddenError("Not authorized to comment on this task");

  const { data, error } = await supabase
    .from("comments")
    .insert({ task_id: taskId, author_id: actingUser.id, body: body.trim() })
    .select()
    .single();
  const comment = single(data, error);

  const admin = createAdminClient();
  const [{ data: priorComments }, { data: managers }] = await Promise.all([
    admin.from("comments").select("author_id").eq("task_id", taskId),
    admin.from("profiles").select("id").eq("role", "manager"),
  ]);
  const participantIds = new Set<string>([
    task.owner_id,
    ...(priorComments ?? []).map((c) => c.author_id),
    ...(managers ?? []).map((m) => m.id),
  ]);
  participantIds.delete(actingUser.id);

  if (participantIds.size > 0) {
    await admin.from("notifications").insert(
      Array.from(participantIds).map((recipientId) => ({
        recipient_id: recipientId,
        task_id: taskId,
        comment_id: comment.id,
        message: `${actingUser.full_name} commented on "${task.name}"`,
      }))
    );
  }
  return comment;
}

// ---------- Stale task reminders ----------

const REMINDER_PREFIX = "Reminder:";

export async function checkAndCreateStaleTaskReminders(): Promise<void> {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("org_settings")
    .select("stale_task_reminder_days")
    .limit(1)
    .maybeSingle();
  const thresholdDays = settings?.stale_task_reminder_days ?? 10;
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const { data: managers } = await admin.from("profiles").select("id").eq("role", "manager");
  const managerIds = (managers ?? []).map((m) => m.id);

  const { data: tasks } = await admin.from("tasks").select("*").neq("status", "done");
  const cutoffIso = new Date(now - thresholdMs).toISOString();

  for (const task of tasks ?? []) {
    const changedAt = new Date(task.status_changed_at).getTime();
    if (Number.isNaN(changedAt) || now - changedAt < thresholdMs) continue;

    const { data: recent } = await admin
      .from("notifications")
      .select("id")
      .eq("task_id", task.id)
      .ilike("message", `${REMINDER_PREFIX}%`)
      .gte("created_at", cutoffIso)
      .limit(1);
    if (recent && recent.length > 0) continue;

    const statusLabel = STATUS_LABELS[task.status] ?? task.status;
    const message = `${REMINDER_PREFIX} "${task.name}" has been "${statusLabel}" for ${thresholdDays}+ days with no update.`;
    const recipients = new Set<string>([task.owner_id, ...managerIds]);
    await admin.from("notifications").insert(
      Array.from(recipients).map((recipientId) => ({
        recipient_id: recipientId,
        task_id: task.id,
        message,
      }))
    );
  }
}

// ---------- Notifications ----------

export async function listNotifications(actingUser: Profile): Promise<Notification[]> {
  await checkAndCreateStaleTaskReminders();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", actingUser.id)
    .order("created_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function markNotificationRead(actingUser: Profile, id: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", actingUser.id);
}

export async function markAllNotificationsRead(actingUser: Profile): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", actingUser.id)
    .eq("is_read", false);
}
