"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

const SectionSchema = z.object({
  courseId: z.string().min(1),
  termId: z.string().min(1),
  sectionCode: z.string().min(1),
  formatId: z.string().optional(),
  instructorId: z.string().optional(),
  roomNumber: z.string().optional(),
  meetingDays: z.string().optional(),
  meetingTime: z.string().optional(),
});

export async function createSection(data: {
  courseId: string;
  termId: string;
  sectionCode: string;
  formatId?: string;
  instructorId?: string;
  roomNumber?: string;
  meetingDays?: string;
  meetingTime?: string;
}) {
  await requireAdmin();
  const parsed = SectionSchema.parse(data);
  await db.section.create({ data: parsed });
  revalidatePath("/admin/sections");
}

export async function updateSection(
  id: string,
  data: {
    courseId: string;
    termId: string;
    sectionCode: string;
    formatId?: string;
    instructorId?: string;
    roomNumber?: string;
    meetingDays?: string;
    meetingTime?: string;
  }
) {
  await requireAdmin();
  const parsed = SectionSchema.parse(data);
  await db.section.update({
    where: { id },
    data: {
      ...parsed,
      formatId: parsed.formatId ?? null,
      instructorId: parsed.instructorId ?? null,
      roomNumber: parsed.roomNumber ?? null,
      meetingDays: parsed.meetingDays ?? null,
      meetingTime: parsed.meetingTime ?? null,
    },
  });
  revalidatePath("/admin/sections");
}

export async function toggleSectionActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.section.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/sections");
}

export async function deleteSection(id: string) {
  await requireAdmin();
  await db.section.delete({ where: { id } });
  revalidatePath("/admin/sections");
}
