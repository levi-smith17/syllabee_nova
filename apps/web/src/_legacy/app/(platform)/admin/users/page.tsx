import { db } from "@/lib/db";
import { auth } from "@/auth";
import { UserRoleBadge } from "./user-role-badge";

export const metadata = { title: "Users — Syllabee Admin" };

export default async function UsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { profile: true },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length} {users.length === 1 ? "user" : "users"} registered
        </p>
      </div>

      <div className="divide-y rounded-xl border">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-4 px-5 py-4">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {user.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {!user.isActive && (
                <span className="text-xs text-muted-foreground">Inactive</span>
              )}
              <UserRoleBadge userId={user.id} role={user.role} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
