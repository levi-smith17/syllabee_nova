"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const Schema = z.object({
  userId: z.string().min(1),
  sectionId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Location fields
  businessName: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  supervisorName: z.string().optional(),
  supervisorEmail: z.string().email().optional().or(z.literal("")),
  supervisorPhone: z.string().optional(),
});

export async function createInternshipWithLocation(formData: FormData) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const raw = Schema.parse({
    userId: formData.get("userId"),
    sectionId: formData.get("sectionId") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    businessName: formData.get("businessName"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
    zip: formData.get("zip") || undefined,
    supervisorName: formData.get("supervisorName") || undefined,
    supervisorEmail: formData.get("supervisorEmail") || undefined,
    supervisorPhone: formData.get("supervisorPhone") || undefined,
  });

  const location = await db.internshipLocation.create({
    data: {
      businessName: raw.businessName,
      address: raw.address,
      city: raw.city,
      state: raw.state,
      zip: raw.zip,
      supervisorName: raw.supervisorName,
      supervisorEmail: raw.supervisorEmail || undefined,
      supervisorPhone: raw.supervisorPhone,
    },
  });

  const internship = await db.internship.create({
    data: {
      userId: raw.userId,
      locationId: location.id,
      sectionId: raw.sectionId,
      startDate: raw.startDate ? new Date(raw.startDate) : undefined,
      endDate: raw.endDate ? new Date(raw.endDate) : undefined,
    },
  });

  redirect(`/internship/${internship.id}`);
}
