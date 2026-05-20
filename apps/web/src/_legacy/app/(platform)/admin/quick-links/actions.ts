"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export async function createQuickLink(data: {
  label: string;
  url: string;
  icon: string;
  restricted: boolean;
}) {
  await requireAdmin();
  const count = await db.quickLink.count();
  await db.quickLink.create({
    data: {
      label: data.label,
      url: data.url,
      icon: data.icon || null,
      restricted: data.restricted,
      sortOrder: count,
    },
  });
  revalidatePath("/admin/quick-links");
}

export async function updateQuickLink(
  id: string,
  data: { label: string; url: string; icon: string; restricted: boolean }
) {
  await requireAdmin();
  await db.quickLink.update({
    where: { id },
    data: {
      label: data.label,
      url: data.url,
      icon: data.icon || null,
      restricted: data.restricted,
    },
  });
  revalidatePath("/admin/quick-links");
}

export async function deleteQuickLink(id: string) {
  await requireAdmin();
  await db.quickLink.delete({ where: { id } });
  revalidatePath("/admin/quick-links");
}
