import { requireCurrentUser } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { MobileBanner } from "@/components/layout/MobileBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await requireCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <MobileBanner />
      <TopBar currentUser={currentUser} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
