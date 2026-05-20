import Link from "next/link";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { db } from "@/lib/db";
import { CreateSyllabusButton } from "./create-syllabus-button";

export const metadata = { title: "Syllabi — Syllabee" };

export default async function EditorIndexPage() {
  const syllabi = await db.masterSyllabus.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      term: { select: { name: true, code: true } },
      _count: { select: { masterBonds: true } },
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Master Syllabi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {syllabi.length} {syllabi.length === 1 ? "syllabus" : "syllabi"}
          </p>
        </div>
        <CreateSyllabusButton />
      </div>

      {/* List */}
      {syllabi.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 gap-4 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No syllabi yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first master syllabus to get started.
            </p>
          </div>
          <CreateSyllabusButton />
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {syllabi.map((s) => (
            <Link
              key={s.id}
              href={`/editor/${s.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate group-hover:text-primary transition-colors">
                  {s.title}
                </p>
                {s.term && (
                  <p className="text-sm text-muted-foreground">
                    {s.term.name} ({s.term.code})
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s._count.masterBonds}{" "}
                  {s._count.masterBonds === 1 ? "segment" : "segments"} ·{" "}
                  {s.interactionMode === "INTERACTIVE" ? "Interactive" : "Static"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.isPublished ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <Eye className="h-3 w-3" /> Published
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <EyeOff className="h-3 w-3" /> Draft
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
