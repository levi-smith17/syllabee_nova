import { db } from "@/lib/db";
import { SectionsManager } from "./sections-manager";

export const metadata = { title: "Sections — Syllabee Admin" };

export default async function SectionsPage() {
  const [sections, courses, terms, instructors, formats, codeRules] = await Promise.all([
    db.section.findMany({
      include: {
        course: { select: { id: true, code: true, title: true } },
        term: { select: { id: true, name: true, code: true, startDate: true, isActive: true } },
        format: { select: { id: true, label: true } },
        _count: { select: { sectionProgress: true } },
      },
      orderBy: [{ term: { startDate: "desc" } }, { course: { code: "asc" } }, { sectionCode: "asc" }],
    }),
    db.course.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    db.term.findMany({ where: { isActive: true }, orderBy: { startDate: "desc" } }),
    db.user.findMany({
      where: { isActive: true, role: { in: ["ADMIN", "INSTRUCTOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    db.sectionFormat.findMany({ orderBy: { label: "asc" } }),
    db.sectionCodeRule.findMany({ include: { format: true }, orderBy: { digit: "asc" } }),
  ]);

  return (
    <SectionsManager
      initialSections={sections.map((s) => ({
        id: s.id,
        sectionCode: s.sectionCode,
        isActive: s.isActive,
        formatId: s.formatId ?? null,
        formatLabel: s.format?.label ?? null,
        meetingDays: s.meetingDays ?? null,
        meetingTime: s.meetingTime ?? null,
        roomNumber: s.roomNumber ?? null,
        instructorId: s.instructorId ?? null,
        course: s.course,
        term: {
          id: s.term.id,
          name: s.term.name,
          code: s.term.code,
          startDate: s.term.startDate.toISOString(),
          isActive: s.term.isActive,
        },
        _count: s._count,
      }))}
      courses={courses.map((c) => ({ id: c.id, code: c.code, title: c.title }))}
      terms={terms.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        startDate: t.startDate.toISOString(),
      }))}
      instructors={instructors.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
      formats={formats.map((f) => ({ id: f.id, label: f.label }))}
      codeRules={codeRules.map((r) => ({ digit: r.digit, formatId: r.formatId, formatLabel: r.format.label }))}
    />
  );
}
