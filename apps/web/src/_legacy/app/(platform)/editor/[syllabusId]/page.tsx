import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SyllabusEditorShell } from "./syllabus-editor-shell";

interface Props {
  params: Promise<{ syllabusId: string }>;
  searchParams: Promise<{ segment?: string; block?: string; edit?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { syllabusId } = await params;
  const s = await db.masterSyllabus.findUnique({ where: { id: syllabusId } });
  return { title: s ? `${s.title} — Syllabee` : "Syllabus — Syllabee" };
}

export default async function SyllabusEditorPage({ params, searchParams }: Props) {
  const { syllabusId } = await params;
  const sp = await searchParams;

  const [syllabus, terms] = await Promise.all([
    db.masterSyllabus.findUnique({
      where: { id: syllabusId },
      include: {
        term: true,
        masterBonds: {
          orderBy: { sortOrder: "asc" },
          include: {
            segment: {
              include: {
                bonds: {
                  orderBy: { sortOrder: "asc" },
                  include: { block: true },
                },
              },
            },
          },
        },
      },
    }),
    db.term.findMany({
      where: { isActive: true },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  if (!syllabus) notFound();

  return (
    <SyllabusEditorShell
      syllabus={syllabus}
      terms={terms}
      activeSegmentId={sp.segment}
      activeBlockId={sp.block}
      editMode={sp.edit}
    />
  );
}
