"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const InternshipSchema = z.object({
  sectionId: z.string().optional(),
  locationId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const LocationSchema = z.object({
  businessName: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  supervisorName: z.string().optional(),
  supervisorEmail: z.string().email().optional().or(z.literal("")),
  supervisorPhone: z.string().optional(),
});

const JournalSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  hoursLogged: z.number().positive(),
  entryDate: z.string(),
});

// ─── Internships ──────────────────────────────────────────────────────────────

export async function createInternship(userId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Only admin or the user themselves can create
  if (session.user.id !== userId && (session.user as any).role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const data = InternshipSchema.parse({
    sectionId: formData.get("sectionId") || undefined,
    locationId: formData.get("locationId") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });

  const internship = await db.internship.create({
    data: {
      userId,
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });

  revalidatePath("/internship");
  return internship;
}

export async function updateInternshipStatus(
  id: string,
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "WITHDRAWN"
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await db.internship.update({ where: { id }, data: { status } });
  revalidatePath("/internship");
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function createLocation(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const data = LocationSchema.parse({
    businessName: formData.get("businessName"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    zip: formData.get("zip") || undefined,
    supervisorName: formData.get("supervisorName") || undefined,
    supervisorEmail: formData.get("supervisorEmail") || undefined,
    supervisorPhone: formData.get("supervisorPhone") || undefined,
  });

  const location = await db.internshipLocation.create({ data });
  revalidatePath("/internship");
  return location;
}

// ─── Journal Entries ─────────────────────────────────────────────────────────

export async function createJournalEntry(
  internshipId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const internship = await db.internship.findUnique({ where: { id: internshipId } });
  if (!internship) throw new Error("Not found");
  if (internship.userId !== session.user.id && (session.user as any).role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const data = JournalSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    hoursLogged: parseFloat(formData.get("hoursLogged") as string),
    entryDate: formData.get("entryDate"),
  });

  const entry = await db.internshipJournalEntry.create({
    data: {
      internshipId,
      ...data,
      entryDate: new Date(data.entryDate),
    },
  });

  // Recalculate total hours
  const all = await db.internshipJournalEntry.findMany({ where: { internshipId } });
  const totalHours = all.reduce((s: number, e: { hoursLogged: number }) => s + e.hoursLogged, 0);
  await db.internship.update({ where: { id: internshipId }, data: { totalHours } });

  revalidatePath(`/internship/${internshipId}`);
  return entry;
}

export async function deleteJournalEntry(id: string, internshipId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await db.internshipJournalEntry.delete({ where: { id } });

  // Recalculate total hours
  const all = await db.internshipJournalEntry.findMany({ where: { internshipId } });
  const totalHours = all.reduce((s: number, e: { hoursLogged: number }) => s + e.hoursLogged, 0);
  await db.internship.update({ where: { id: internshipId }, data: { totalHours } });

  revalidatePath(`/internship/${internshipId}`);
}
