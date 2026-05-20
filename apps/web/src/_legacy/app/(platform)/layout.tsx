import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/nav/sidebar";
import { SidebarProvider } from "@/components/nav/sidebar-context";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, allQuickLinks] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    }),
    db.quickLink.findMany({ orderBy: { label: "asc" } }),
  ]);

  const role = user?.role ?? "STUDENT";
  const isAdmin = role === "ADMIN";
  const isStaff = role === "ADMIN" || role === "INSTRUCTOR";

  // Regular links go to everyone; restricted links go to instructors + admins only
  const quickLinks = allQuickLinks
    .filter((l) => !l.restricted)
    .map((l) => ({ id: l.id, label: l.label, url: l.url, icon: l.icon ?? "" }));
  const restrictedQuickLinks = isStaff
    ? allQuickLinks
        .filter((l) => l.restricted)
        .map((l) => ({ id: l.id, label: l.label, url: l.url, icon: l.icon ?? "" }))
    : [];

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isAdmin={isAdmin} quickLinks={quickLinks} restrictedQuickLinks={restrictedQuickLinks} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
