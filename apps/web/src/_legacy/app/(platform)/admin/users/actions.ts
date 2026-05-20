"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function updateUserRole(
  userId: string,
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT"
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}
