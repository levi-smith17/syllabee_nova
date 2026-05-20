"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Search, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createCourse,
  updateCourse,
  toggleCourseActive,
  deleteCourse,
} from "./actions";

interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  creditHours: number;
  isActive: boolean;
  isInternship: boolean;
}

interface Props {
  initialCourses: Course[];
}

const EMPTY_FORM = { code: "", title: "", description: "", creditHours: 3, isInternship: false };
const PAGE_SIZE = 20;

type StatusFilter = "all" | "active" | "inactive";

// Yellow chip — status filters (All / Active / Inactive)
const statusChipClass = (active: boolean) =>
  cn(
    "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
    "border border-yellow-400",
    active
      ? "bg-yellow-400 text-yellow-900"
      : "bg-transparent text-foreground hover:bg-yellow-400/10"
  );

// Cyan chip — prefix filters (mirrors sidebar-foreground cyan)
const prefixChipClass = (active: boolean) =>
  cn(
    "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
    "border",
    active
      ? "bg-sidebar-foreground text-sidebar border-sidebar-foreground"
      : "text-sidebar-foreground border-sidebar-foreground/40 hover:bg-sidebar-foreground/10"
  );

// Yellow button classes (applied via className override)
const yellowBtn =
  "bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500";

export function CoursesManager({ initialCourses }: Props) {
  const [courses, setCourses] = React.useState(initialCourses);
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [prefixFilter, setPrefixFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);

  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; code: string } | null>(null);

  const prefixes = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      const p = c.code.split("-")[0];
      if (p) set.add(p);
    }
    return Array.from(set).sort();
  }, [courses]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (prefixFilter !== "all" && !c.code.startsWith(prefixFilter + "-")) return false;
      if (statusFilter === "active" && !c.isActive) return false;
      if (statusFilter === "inactive" && c.isActive) return false;
      if (q && !c.code.toLowerCase().includes(q) && !c.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [courses, search, prefixFilter, statusFilter]);


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function fieldSetter(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }
  function editFieldSetter(field: keyof typeof editForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createCourse({ ...form, creditHours: Number(form.creditHours) });
      toast.success(`Course ${form.code.toUpperCase()} created.`);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await updateCourse(id, { ...editForm, creditHours: Number(editForm.creditHours) });
      toast.success("Course updated.");
      setEditingId(null);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    try {
      await toggleCourseActive(id, !current);
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: !current } : c)));
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    const { id, code } = deleteTarget;
    setDeletingId(id);
    setDeleteTarget(null);
    try {
      await deleteCourse(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Course ${code} deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete course.");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(course: Course) {
    setEditingId(course.id);
    setEditForm({
      code: course.code,
      title: course.title,
      description: course.description ?? "",
      creditHours: course.creditHours,
      isInternship: course.isInternship,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3 flex flex-col gap-1.5">

        {/* Title + subtitle inline + Add Course */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0 md:h-8">
            <h1 className="text-xl text-primary font-bold leading-none shrink-0">Courses</h1>
            <p className="text-xs text-muted-foreground truncate"> — manage course catalog</p>
          </div>
          <Button
            size="sm"
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className={cn("gap-2 shrink-0 rounded-none", yellowBtn)}
          >
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        </div>

        {/* Search + status chips + prefix chips + results count */}
        <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center">
          <div className={cn(
            "flex items-center h-8 border border-transparent bg-background transition-colors focus-within:border-primary",
            "md:min-w-36 md:max-w-56",
          )}>
            <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-xs px-2 outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="mr-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`${statusChipClass(statusFilter === s)} grow md:grow-0 h-8`}>
                {s === "all" ? "All" : s === "active" ? "Active" : "Inactive"}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => { setPrefixFilter("all"); setPage(1); }} className={`${prefixChipClass(prefixFilter === "all")} grow md:grow-0 h-8`}>
              All
            </button>
            {prefixes.map((p) => (
              <button key={p} onClick={() => { setPrefixFilter(p); setPage(1); }} className={`${prefixChipClass(prefixFilter === p)} grow md:grow-0 h-8`}>
                {p}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length === courses.length
                ? `${courses.length} course${courses.length !== 1 ? "s" : ""}`
                : `${filtered.length} of ${courses.length}`}
              {totalPages > 1 && ` — page ${page} of ${totalPages}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable list ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

        {/* Add form */}
        {showAdd && (
          <form onSubmit={handleCreate} className="border p-5 space-y-4 bg-muted/40">
            <h3 className="font-semibold text-sm">New Course</h3>
            <div className="grid md:grid-cols-[120px_1fr_90px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Course Code</Label>
                <Input id="code" value={form.code} onChange={fieldSetter("code")} placeholder="CIS-121S" className="uppercase rounded-none" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={fieldSetter("title")} placeholder="Introduction to Programming" className="rounded-none" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditHours">Credits</Label>
                <Input id="creditHours" type="number" min={0} max={12} value={form.creditHours} onChange={fieldSetter("creditHours")} className="rounded-none" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" value={form.description} onChange={fieldSetter("description")} placeholder="Brief course description…" className="rounded-none" />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isInternship}
                onChange={(e) => setForm((f) => ({ ...f, isInternship: e.target.checked }))}
                className="h-3.5 w-3.5 accent-yellow-400"
              />
              Internship-eligible course
            </label>
            <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between">
              <Button type="button" variant="ghost" size="sm" className="bg-muted/70 rounded-none" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Course
              </Button>
            </div>
          </form>
        )}

        {/* Course rows */}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            No courses match the current filters.
          </p>
        ) : (
          <div className="border overflow-hidden">
            {paginated.map((course) =>
              editingId === course.id ? (
                <div key={course.id} className="p-4 space-y-3 bg-muted/40 border-b last:border-b-0">
                  <div className="grid md:grid-cols-[120px_1fr_90px] gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Code</Label>
                      <Input value={editForm.code} onChange={editFieldSetter("code")} className="h-8 text-sm uppercase rounded-none" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input value={editForm.title} onChange={editFieldSetter("title")} className="h-8 text-sm rounded-none" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Credits</Label>
                      <Input type="number" min={0} max={12} value={editForm.creditHours} onChange={editFieldSetter("creditHours")} className="h-8 text-sm rounded-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={editForm.description} onChange={editFieldSetter("description")} className="h-8 text-sm rounded-none" placeholder="Optional" />
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editForm.isInternship}
                      onChange={(e) => setEditForm((f) => ({ ...f, isInternship: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-yellow-400"
                    />
                    Internship-eligible course
                  </label>
                  <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-none bg-muted/70" disabled={saving}>
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate(course.id)} className="rounded-none" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={course.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 bg-muted/20",
                    !course.isActive && "opacity-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{course.code}</span>
                      {course.isInternship && (
                        <span className="text-xs text-orange-600 dark:text-orange-400">Internship</span>
                      )}
                      {!course.isActive && (
                        <span className="text-xs text-muted-foreground">(inactive)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {course.title} <span className="text-xs">· {course.creditHours} credit{course.creditHours !== 1 ? "s" : ""}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost" className="h-8 px-2 text-xs"
                      onClick={() => handleToggle(course.id, course.isActive)}
                      disabled={togglingId === course.id}
                    >
                      {togglingId === course.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : course.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(course)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ id: course.id, code: course.code })}
                      disabled={deletingId === course.id}
                    >
                      {deletingId === course.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

      </div>

      {/* ── Fixed footer (pagination) ────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="shrink-0 bg-muted border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`${yellowBtn} rounded-none`}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={cn(
                        "h-7 w-7 text-xs font-medium transition-colors",
                        page === p
                          ? "bg-yellow-400 text-yellow-900"
                          : "hover:bg-muted-foreground/10 text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`${yellowBtn} rounded-none`}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Delete dialog ────────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete course?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.code}</strong> will be permanently removed. This cannot be undone.
              Sections referencing this course must be removed first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
