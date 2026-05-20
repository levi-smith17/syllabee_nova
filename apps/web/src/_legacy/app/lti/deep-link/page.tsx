import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DeepLinkSelector } from "./deep-link-selector";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export const metadata = { title: "Select Syllabus — Syllabee" };

export default async function DeepLinkPage({ searchParams }: Props) {
  const sp = await searchParams;
  if (!sp.token) notFound();

  const link = await db.ltiDeepLink.findUnique({ where: { token: sp.token } });
  if (!link || link.expiresAt < new Date()) notFound();

  // Sections that have at least one published masterBondSection
  const sections = await db.section.findMany({
    where: {
      isActive: true,
      masterBondSections: {
        some: {
          masterBond: {
            masterSyllabus: { isPublished: true },
          },
        },
      },
    },
    include: {
      course: true,
      term: true,
    },
    orderBy: [{ term: { startDate: "desc" } }, { course: { code: "asc" } }],
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Select a Syllabus</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Choose the syllabus to embed in your course.
        </p>
        <DeepLinkSelector sections={sections} token={sp.token} />
      </div>
    </div>
  );
}
