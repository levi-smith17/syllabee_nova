import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalEntryForm } from "./journal-entry-form";
import { deleteJournalEntry } from "@/actions/internship";

interface Props {
  params: Promise<{ internshipId: string }>;
}

export const metadata = { title: "Internship Detail — Syllabee" };

export default async function InternshipDetailPage({ params }: Props) {
  const { internshipId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = (session.user as any).role === "ADMIN";

  const internship = await db.internship.findUnique({
    where: { id: internshipId },
    include: {
      user: { select: { name: true, email: true } },
      location: true,
      section: { include: { course: true, term: true } },
      journalEntries: { orderBy: { entryDate: "desc" } },
    },
  });

  if (!internship) notFound();

  // Non-admin can only view their own
  if (!isAdmin && internship.userId !== session.user.id) notFound();

  const settings = await db.internshipSettings.findFirst();

  return (
    <div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto">
      {/* Back */}
      <Link
        href="/internship"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Internships
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">
              {internship.location?.businessName ?? "Internship"}
            </h1>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-1">
                {internship.user.name ?? internship.user.email}
              </p>
            )}
          </div>

          {/* Journal entries */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Journal Entries</h2>
              <span className="text-sm text-muted-foreground">
                {internship.totalHours.toFixed(1)} total hours
              </span>
            </div>

            {internship.journalEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No entries yet.</p>
            ) : (
              <div className="divide-y rounded-xl border">
                {internship.journalEntries.map((entry) => (
                  <div key={entry.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{entry.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(entry.entryDate).toLocaleDateString()} ·{" "}
                          {entry.hoursLogged} hrs
                        </p>
                        <p className="text-sm mt-2 whitespace-pre-wrap">
                          {entry.description}
                        </p>
                      </div>
                      {(isAdmin || internship.userId === session.user?.id) && (
                        <form
                          action={async () => {
                            "use server";
                            await deleteJournalEntry(entry.id, internshipId);
                          }}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add entry form */}
            <div className="mt-4">
              <JournalEntryForm internshipId={internshipId} />
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Location */}
          {internship.location && (
            <div className="rounded-xl border p-4 space-y-2">
              <h3 className="font-semibold text-sm">Location</h3>
              <div className="text-sm space-y-1">
                <p>{internship.location.businessName}</p>
                {internship.location.address && (
                  <p className="text-muted-foreground text-xs">
                    {internship.location.address}
                    <br />
                    {internship.location.city}, {internship.location.state}{" "}
                    {internship.location.zip}
                  </p>
                )}
              </div>
              {internship.location.supervisorName && (
                <div className="pt-2 border-t text-sm space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    Supervisor
                  </p>
                  <p>{internship.location.supervisorName}</p>
                  {internship.location.supervisorEmail && (
                    <p className="text-xs text-muted-foreground">
                      {internship.location.supervisorEmail}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hours progress */}
          {settings && (
            <div className="rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold text-sm">Hours Progress</h3>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{internship.totalHours.toFixed(1)} hrs logged</span>
                  <span>{settings.minHoursRequired} hrs required</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (internship.totalHours / settings.minHoursRequired) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section */}
          {internship.section && (
            <div className="rounded-xl border p-4 text-sm space-y-1">
              <h3 className="font-semibold text-sm mb-2">Course Section</h3>
              <p>{internship.section.course.code}</p>
              <p className="text-muted-foreground text-xs">
                {internship.section.term.name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
