import { requireCurrentUser } from "@/lib/auth";
import {
  listProjects,
  listVisibleTasks,
  listEntriesForTasks,
  listLeaves,
  listHolidays,
  listBrands,
  listProfiles,
  listCommentCounts,
} from "@/lib/store/db";
import { TrackerBoard } from "@/components/tracker/TrackerBoard";

export default async function TrackerPage() {
  const currentUser = await requireCurrentUser();
  const [projects, tasks, leaves, holidays, brands, profiles, commentCounts] = await Promise.all([
    listProjects(),
    listVisibleTasks(currentUser),
    listLeaves(),
    listHolidays(),
    listBrands(),
    listProfiles(),
    listCommentCounts(),
  ]);
  const entries = await listEntriesForTasks(tasks.map((t) => t.id));

  return (
    <TrackerBoard
      key={currentUser.id}
      currentUser={currentUser}
      initialProjects={projects}
      initialTasks={tasks}
      initialEntries={entries}
      initialLeaves={leaves}
      initialHolidays={holidays}
      initialBrands={brands}
      initialProfiles={profiles}
      initialCommentCounts={commentCounts}
    />
  );
}
