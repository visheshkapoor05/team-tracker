import { requireCurrentUser } from "@/lib/auth";
import {
  listProjects,
  listVisibleTasks,
  listEntriesForTasks,
  listLeaves,
  listHolidays,
  listBrands,
  listProfiles,
  listOffices,
} from "@/lib/store/db";
import { AllocationBoard } from "@/components/allocation/AllocationBoard";

export default async function AllocationPage() {
  const currentUser = await requireCurrentUser();
  const [projects, tasks, leaves, holidays, brands, profiles, offices] = await Promise.all([
    listProjects(),
    listVisibleTasks(currentUser),
    listLeaves(),
    listHolidays(),
    listBrands(),
    listProfiles(),
    listOffices(),
  ]);
  const entries = await listEntriesForTasks(tasks.map((t) => t.id));
  const canViewAll = currentUser.role === "manager" || currentUser.role === "lead";
  const scopedLeaves = canViewAll ? leaves : leaves.filter((l) => l.profile_id === currentUser.id);

  return (
    <AllocationBoard
      key={currentUser.id}
      currentUser={currentUser}
      projects={projects}
      tasks={tasks}
      entries={entries}
      leaves={scopedLeaves}
      holidays={holidays}
      brands={brands}
      profiles={profiles}
      offices={offices}
    />
  );
}
