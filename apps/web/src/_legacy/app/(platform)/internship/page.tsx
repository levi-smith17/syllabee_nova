import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Internships — Syllabee" };

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  WITHDRAWN: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default async function InternshipPage() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const internships = await db.internship.findMany({
    where: isAdmin ? undefined : { userId: session?.user?.id },
    include: {
      user: { select: { name: true, email: true } },
      location: { select: { businessName: true, city: true, state: true } },
      section: { include: { course: { select: { code: true } } } },
      _count: { select: { journalEntries: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Internships</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {internships.length} {internships.length === 1 ? "internship" : "internships"}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" asChild>
            <Link href="/internship/new">
              <Plus className="h-4 w-4" />
              New Internship
            </Link>
          </Button>
        )}
      </div>

      {internships.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 gap-4 text-center">
          <BriefcaseBusiness className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No internships yet.</p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {internships.map((i) => (
            <Link
              key={i.id}
              href={`/internship/${i.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                {isAdmin && (
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {i.user.name ?? i.user.email}
                  </p>
                )}
                <p className="font-medium truncate group-hover:text-primary">
                  {i.location?.businessName ?? "No location set"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {i.location?.city && `${i.location.city}, ${i.location.state} · `}
                  {i._count.journalEntries} entries · {i.totalHours.toFixed(1)} hrs
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                {i.section && (
                  <span className="text-xs text-muted-foreground">
                    {i.section.course.code}
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status as keyof typeof STATUS_COLORS] ?? ""}`}
                >
                  {i.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
