import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/auth/SignupForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/tracker");

  return <SignupForm />;
}
