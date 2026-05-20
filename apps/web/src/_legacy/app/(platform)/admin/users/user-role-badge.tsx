"use client";

import * as React from "react";
import { toast } from "sonner";
import { updateUserRole } from "./actions";

const ROLE_COLORS = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  INSTRUCTOR: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  STUDENT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function UserRoleBadge({
  userId,
  role,
}: {
  userId: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
}) {
  const [current, setCurrent] = React.useState(role);
  const [loading, setLoading] = React.useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as typeof role;
    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
      setCurrent(newRole);
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={loading}
      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${ROLE_COLORS[current]}`}
    >
      <option value="STUDENT">Student</option>
      <option value="INSTRUCTOR">Instructor</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
