import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/");

  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
