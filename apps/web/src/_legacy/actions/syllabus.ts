"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MasterSyllabusSchema, SegmentSchema } from "@/lib/schemas/syllabus";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Master Syllabus ──────────────────────────────────────────────────────────

export async function createMasterSyllabus(formData: FormData) {
  const ownerId = await requireUser();

  const parsed = MasterSyllabusSchema.parse({
    title: formData.get("title"),
    termId: formData.get("termId") || undefined,
    interactionMode: formData.get("interactionMode") || "INTERACTIVE",
    isPublished: formData.get("isPublished") === "true",
    showProgress: formData.get("showProgress") !== "false",
    allowPrint: formData.get("allowPrint") !== "false",
  });

  const syllabus = await db.masterSyllabus.create({ data: { ...parsed, ownerId } });
  revalidatePath("/editor");
  return syllabus;
}

export async function updateMasterSyllabus(id: string, formData: FormData) {
  await requireUser();

  const parsed = MasterSyllabusSchema.parse({
    title: formData.get("title"),
    termId: formData.get("termId") || undefined,
    interactionMode: formData.get("interactionMode") || "INTERACTIVE",
    isPublished: formData.get("isPublished") === "true",
    showProgress: formData.get("showProgress") !== "false",
    allowPrint: formData.get("allowPrint") !== "false",
  });

  const syllabus = await db.masterSyllabus.update({
    where: { id },
    data: { ...parsed, termId: parsed.termId ?? null },
  });
  revalidatePath("/editor");
  revalidatePath(`/editor/${id}`);
  return syllabus;
}

export async function deleteMasterSyllabus(id: string) {
  await requireUser();
  await db.masterSyllabus.delete({ where: { id } });
  revalidatePath("/editor");
}

export async function togglePublished(id: string, published: boolean) {
  await requireUser();
  await db.masterSyllabus.update({
    where: { id },
    data: { isPublished: published },
  });
  revalidatePath("/editor");
  revalidatePath(`/editor/${id}`);
}

// ─── Segments ────────────────────────────────────────────────────────────────

export async function createSegment(
  masterSyllabusId: string,
  formData: FormData
) {
  const ownerId = await requireUser();

  const parsed = SegmentSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    isVisible: formData.get("isVisible") !== "false",
  });

  // Find current max sortOrder for this syllabus
  const maxBond = await db.masterBond.findFirst({
    where: { masterSyllabusId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const segment = await db.segment.create({ data: { ...parsed, ownerId } });
  await db.masterBond.create({
    data: {
      masterSyllabusId,
      segmentId: segment.id,
      sortOrder: (maxBond?.sortOrder ?? -1) + 1,
      ownerId,
    },
  });

  revalidatePath(`/editor/${masterSyllabusId}`);
  return segment;
}

export async function updateSegment(id: string, masterSyllabusId: string, formData: FormData) {
  await requireUser();

  const parsed = SegmentSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    isVisible: formData.get("isVisible") !== "false",
  });

  const segment = await db.segment.update({ where: { id }, data: parsed });
  revalidatePath(`/editor/${masterSyllabusId}`);
  return segment;
}

export async function deleteSegment(id: string, masterSyllabusId: string) {
  await requireUser();
  // MasterBond cascade will clean up
  await db.segment.delete({ where: { id } });
  revalidatePath(`/editor/${masterSyllabusId}`);
}

export async function reorderSegments(
  masterSyllabusId: string,
  orderedSegmentIds: string[]
) {
  await requireUser();

  await Promise.all(
    orderedSegmentIds.map((segmentId, index) =>
      db.masterBond.updateMany({
        where: { masterSyllabusId, segmentId },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath(`/editor/${masterSyllabusId}`);
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

export async function createBlock(
  segmentId: string,
  masterSyllabusId: string,
  type: string,
  data: Record<string, unknown> = {}
) {
  const ownerId = await requireUser();

  const maxBond = await db.bond.findFirst({
    where: { segmentId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const block = await db.block.create({
    data: { type: type as any, data: data as any, ownerId },
  });

  await db.bond.create({
    data: {
      segmentId,
      blockId: block.id,
      sortOrder: (maxBond?.sortOrder ?? -1) + 1,
      ownerId,
    },
  });

  revalidatePath(`/editor/${masterSyllabusId}/segment/${segmentId}`);
  return block;
}

export async function updateBlock(
  id: string,
  masterSyllabusId: string,
  segmentId: string,
  updates: { title?: string; isVisible?: boolean; data?: Record<string, unknown> }
) {
  await requireUser();

  const block = await db.block.update({
    where: { id },
    data: {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.isVisible !== undefined && { isVisible: updates.isVisible }),
      ...(updates.data !== undefined && { data: updates.data as any }),
    },
  });

  revalidatePath(`/editor/${masterSyllabusId}/segment/${segmentId}`);
  return block;
}

export async function deleteBlock(
  id: string,
  masterSyllabusId: string,
  segmentId: string
) {
  await requireUser();
  await db.block.delete({ where: { id } });
  revalidatePath(`/editor/${masterSyllabusId}/segment/${segmentId}`);
}

export async function reorderBlocks(
  segmentId: string,
  masterSyllabusId: string,
  orderedBlockIds: string[]
) {
  await requireUser();

  await Promise.all(
    orderedBlockIds.map((blockId, index) =>
      db.bond.updateMany({
        where: { segmentId, blockId },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath(`/editor/${masterSyllabusId}/segment/${segmentId}`);
}
