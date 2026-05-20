"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

const CourseSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  title: z.string().min(1),
  description: z.string().optional(),
  creditHours: z.coerce.number().int().min(0).max(12),
  isInternship: z.boolean().optional(),
});

export async function createCourse(data: {
  code: string;
  title: string;
  description: string;
  creditHours: number;
  isInternship?: boolean;
}) {
  await requireAdmin();
  const parsed = CourseSchema.parse(data);
  await db.course.create({ data: parsed });
  revalidatePath("/admin/courses");
}

export async function updateCourse(
  id: string,
  data: { code: string; title: string; description: string; creditHours: number; isInternship?: boolean }
) {
  await requireAdmin();
  const parsed = CourseSchema.parse(data);
  await db.course.update({ where: { id }, data: parsed });
  revalidatePath("/admin/courses");
}

export async function toggleCourseActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.course.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/courses");
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  const sectionCount = await db.section.count({ where: { courseId: id } });
  if (sectionCount > 0) {
    throw new Error("Cannot delete a course that has sections. Deactivate it instead.");
  }
  await db.course.delete({ where: { id } });
  revalidatePath("/admin/courses");
}
