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

const TermSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).toUpperCase(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  termLengthId: z.string().optional(),
});

export async function createTerm(data: {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  termLengthId?: string;
}) {
  await requireAdmin();
  const parsed = TermSchema.parse(data);
  await db.term.create({
    data: {
      name: parsed.name,
      code: parsed.code,
      startDate: new Date(parsed.startDate),
      endDate: new Date(parsed.endDate),
      termLengthId: parsed.termLengthId || undefined,
    },
  });
  revalidatePath("/admin/terms");
}

export async function updateTerm(
  id: string,
  data: {
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    termLengthId?: string;
  }
) {
  await requireAdmin();
  const parsed = TermSchema.parse(data);
  await db.term.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code,
      startDate: new Date(parsed.startDate),
      endDate: new Date(parsed.endDate),
      termLengthId: parsed.termLengthId || undefined,
    },
  });
  revalidatePath("/admin/terms");
}

export async function toggleTermActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.$transaction([
    db.term.update({ where: { id }, data: { isActive } }),
    ...(isActive ? [] : [db.section.updateMany({ where: { termId: id }, data: { isActive: false } })]),
  ]);
  revalidatePath("/admin/terms");
  revalidatePath("/admin/sections");
}

export async function deleteTerm(id: string) {
  await requireAdmin();
  const sectionCount = await db.section.count({ where: { termId: id } });
  if (sectionCount > 0) {
    throw new Error("Cannot delete a term that has sections. Deactivate it instead.");
  }
  await db.term.delete({ where: { id } });
  revalidatePath("/admin/terms");
}