import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInternshipWithLocation } from "./actions";

export const metadata = { title: "New Internship — Syllabee" };

export default async function NewInternshipPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/internship");
  }

  const [users, sections] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    db.section.findMany({
      where: { isActive: true, course: { isInternship: true } },
      include: { course: { select: { code: true, title: true } }, term: { select: { name: true } } },
      orderBy: [{ term: { startDate: "desc" } }, { course: { code: "asc" } }],
    }),
  ]);

  return (
    <div className="p-6 max-w-2xl mx-auto h-full overflow-y-auto">
      <Link
        href="/internship"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Internships
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Internship</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create an internship record for a student.
        </p>
      </div>

      <form action={createInternshipWithLocation} className="space-y-8">
        {/* Student */}
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Student</h2>
          <div className="space-y-1.5">
            <Label htmlFor="userId">Student</Label>
            <select
              id="userId"
              name="userId"
              required
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select a student…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email} {u.name ? `(${u.email})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sectionId">Course Section (optional)</Label>
            <select
              id="sectionId"
              name="sectionId"
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.course.code} — {s.term.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Internship Location</h2>

          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              name="businessName"
              placeholder="Acme Corporation"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" name="address" placeholder="123 Main St" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="Piqua" />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" placeholder="OH" maxLength={2} />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" name="zip" placeholder="45356" />
            </div>
          </div>

          <div className="pt-2 border-t space-y-4">
            <p className="text-sm font-medium">Supervisor (optional)</p>
            <div className="space-y-1.5">
              <Label htmlFor="supervisorName">Name</Label>
              <Input id="supervisorName" name="supervisorName" placeholder="Jane Smith" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supervisorEmail">Email</Label>
                <Input
                  id="supervisorEmail"
                  name="supervisorEmail"
                  type="email"
                  placeholder="jane@acme.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supervisorPhone">Phone</Label>
                <Input
                  id="supervisorPhone"
                  name="supervisorPhone"
                  type="tel"
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/internship">Cancel</Link>
          </Button>
          <Button type="submit">Create Internship</Button>
        </div>
      </form>
    </div>
  );
}
