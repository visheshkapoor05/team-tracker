import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";
import { listProfiles, listBrands, listHolidays, listOffices, getOrgSettings } from "@/lib/store/db";
import { AdminBoard } from "@/components/admin/AdminBoard";

export default async function AdminPage() {
  const currentUser = await requireCurrentUser();
  if (currentUser.role !== "manager") {
    redirect("/tracker");
  }

  const [profiles, brands, holidays, offices, orgSettings] = await Promise.all([
    listProfiles(),
    listBrands(),
    listHolidays(),
    listOffices(),
    getOrgSettings(),
  ]);

  return (
    <AdminBoard
      key={currentUser.id}
      currentUser={currentUser}
      initialProfiles={profiles}
      initialBrands={brands}
      initialHolidays={holidays}
      initialOffices={offices}
      initialOrgSettings={orgSettings}
    />
  );
}
