import { db } from "@/lib/db";
import { CoursesManager } from "./courses-manager";

export const metadata = { title: "Courses — Syllabee Admin" };

type CourseRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  creditHours: number;
  isActive: boolean;
  isInternship: boolean;
};

export default async function CoursesPage() {
  const courses = (await db.course.findMany({ orderBy: { code: "asc" } })) as CourseRow[];

  return (
    <CoursesManager
      initialCourses={courses.map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description ?? null,
        creditHours: c.creditHours,
        isActive: c.isActive,
        isInternship: c.isInternship,
      }))}
    />
  );
}
