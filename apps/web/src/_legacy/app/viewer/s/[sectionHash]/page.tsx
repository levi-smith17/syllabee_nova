import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { SyllabusViewer } from "@/components/viewer/syllabus-viewer";

interface Props {
  params: Promise<{ sectionHash: string }>;
  searchParams: Promise<{ seg?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { sectionHash } = await params;
  const section = await db.section.findUnique({
    where: { hash: sectionHash },
    include: { course: true },
  });
  const title = section?.course?.title ?? "Syllabus";
  return { title: `${title} — Syllabee` };
}

export default async function InteractiveViewerPage({ params, searchParams }: Props) {
  const { sectionHash } = await params;
  const sp = await searchParams;

  // Load section with its masterBondSections → masterBonds → syllabus content
  const section = await db.section.findUnique({
    where: { hash: sectionHash },
    include: {
      course: true,
      term: true,
      masterBondSections: {
        include: {
          masterBond: {
            include: {
              masterSyllabus: true,
              segment: {
                include: {
                  bonds: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                      block: {
                        include: {
                          scheduleUnits: {
                            orderBy: { sortOrder: "asc" },
                            include: { topics: { orderBy: { sortOrder: "asc" } } },
                          },
                          questions: {
                            orderBy: { sortOrder: "asc" },
                            include: { choices: { orderBy: { sortOrder: "asc" } } },
                          },
                          gradeDetermRows: { orderBy: { sortOrder: "asc" } },
                          listItems: { orderBy: { sortOrder: "asc" } },
                          fileAttachments: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { masterBond: { sortOrder: "asc" } },
      },
    },
  });

  if (!section || section.masterBondSections.length === 0) notFound();

  // Derive the syllabus settings from the first bond's masterSyllabus
  const masterSyllabus = section.masterBondSections[0].masterBond.masterSyllabus;
  if (!masterSyllabus?.isPublished) notFound();

  // Reconstruct a syllabus-shaped object the viewer expects
  const syllabus = {
    ...masterSyllabus,
    masterBonds: section.masterBondSections.map((mbs) => ({
      ...mbs.masterBond,
      segment: mbs.masterBond.segment,
    })),
  };

  // Get current user for progress tracking
  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Load or create progress record
  let progress = null;
  if (userId) {
    progress = await db.sectionProgress.findUnique({
      where: { userId_sectionId: { userId, sectionId: section.id } },
      include: {
        masterBondProgress: {
          include: { bondProgress: { include: { responseProgress: true } } },
        },
      },
    });

    if (!progress) {
      progress = await db.sectionProgress.create({
        data: { userId, sectionId: section.id },
        include: {
          masterBondProgress: {
            include: { bondProgress: { include: { responseProgress: true } } },
          },
        },
      });
    }
  }

  const activeSegmentId = sp.seg ?? syllabus.masterBonds[0]?.segment.id;

  return (
    <SyllabusViewer
      syllabus={syllabus}
      section={section}
      progress={progress}
      activeSegmentId={activeSegmentId}
      userId={userId}
    />
  );
}
