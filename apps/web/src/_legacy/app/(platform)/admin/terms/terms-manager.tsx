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
import { createTerm, updateTerm, toggleTermActive, deleteTerm } from "./actions";

interface Term {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  termLengthId: string | null;
}

interface TermLength {
  id: string;
  label: string;
  weeks: number;
}

interface Props {
  initialTerms: Term[];
  termLengths: TermLength[];
}

const EMPTY_FORM = { name: "", code: "", startDate: "", endDate: "", termLengthId: "" };
const PAGE_SIZE = 20;

type StatusFilter = "all" | "active" | "inactive";

const statusChipClass = (active: boolean) =>
  cn(
    "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
    "border border-yellow-400",
    active
      ? "bg-yellow-400 text-yellow-900"
      : "bg-transparent text-foreground hover:bg-yellow-400/10"
  );

const prefixChipClass = (active: boolean) =>
  cn(
    "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
    "border",
    active
      ? "bg-sidebar-foreground text-sidebar border-sidebar-foreground"
      : "text-sidebar-foreground border-sidebar-foreground/40 hover:bg-sidebar-foreground/10"
  );

const yellowBtn =
  "bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500";

function fmt(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toInputDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export function TermsManager({ initialTerms, termLengths }: Props) {
  const [terms, setTerms] = React.useState(initialTerms);
  const [showAdd, setShowAdd] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState(EMPTY_FORM);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);

  const [search, setSearch] = React.useState("");
  const [termLengthFilter, setTermLengthFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return terms.filter((t) => {
      if (termLengthFilter !== "all" && t.termLengthId !== termLengthFilter) return false;
      if (statusFilter === "active" && !t.isActive) return false;
      if (statusFilter === "inactive" && t.isActive) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [terms, search, termLengthFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function fieldSetter(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }
  function editFieldSetter(field: keyof typeof editForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createTerm({ ...form, termLengthId: form.termLengthId || undefined });
      toast.success(`Term "${form.name}" created.`);
      setForm(EMPTY_FORM);
      setShowAdd(false);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create term.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      await updateTerm(id, { ...editForm, termLengthId: editForm.termLengthId || undefined });
      toast.success("Term updated.");
      setEditingId(null);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update term.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    try {
      await toggleTermActive(id, !current);
      setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !current } : t)));
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeletingId(id);
    setDeleteTarget(null);
    try {
      await deleteTerm(id);
      setTerms((prev) => prev.filter((t) => t.id !== id));
      toast.success(`Term "${name}" deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete term.");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(term: Term) {
    setEditingId(term.id);
    setEditForm({
      name: term.name,
      code: term.code,
      startDate: toInputDate(term.startDate),
      endDate: toInputDate(term.endDate),
      termLengthId: term.termLengthId ?? "",
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3 flex flex-col gap-2">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0 md:h-8">
            <h1 className="text-xl text-primary font-bold leading-none shrink-0">Terms</h1>
            <p className="text-xs text-muted-foreground truncate"> — manage academic terms</p>
          </div>
          <Button
            size="sm"
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className={cn("gap-2 shrink-0 rounded-none", yellowBtn)}
          >
            <Plus className="h-4 w-4" />
            Add Term
          </Button>
        </div>

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
            <button onClick={() => { setTermLengthFilter("all"); setPage(1); }} className={`${prefixChipClass(termLengthFilter === "all")} grow md:grow-0 h-8`}>
              All
            </button>
            {termLengths.map((tl) => (
              <button key={tl.id} onClick={() => { setTermLengthFilter(tl.id); setPage(1); }} className={`${prefixChipClass(termLengthFilter === tl.id)} grow md:grow-0 h-8 truncate`}>
                {tl.label}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap md:h-8">
              {filtered.length === terms.length
                ? `${terms.length} term${terms.length !== 1 ? "s" : ""}`
                : `${filtered.length} of ${terms.length}`}
              {totalPages > 1 && ` — page ${page} of ${totalPages}`}
            </span>
          </div>
        </div>

      </div>

      {/* ── Scrollable list ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

        {showAdd && (
          <form onSubmit={handleCreate} className="border p-5 space-y-4 bg-muted/40">
            <h3 className="font-semibold text-sm">New Term</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={fieldSetter("name")} placeholder="Fall 2025" className="rounded-none" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={form.code} onChange={fieldSetter("code")} placeholder="FA25" className="uppercase rounded-none" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={fieldSetter("startDate")} className="rounded-none" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={fieldSetter("endDate")} className="rounded-none" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="termLengthId">Term Length (optional)</Label>
              <select
                id="termLengthId"
                value={form.termLengthId}
                onChange={fieldSetter("termLengthId")}
                className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">None</option>
                {termLengths.map((tl) => (
                  <option key={tl.id} value={tl.id}>{tl.label} ({tl.weeks} weeks)</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between">
              <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Term
              </Button>
            </div>
          </form>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            No terms match the current filters.
          </p>
        ) : (
          <div className="border overflow-hidden">
            {paginated.map((term) =>
              editingId === term.id ? (
                <div key={term.id} className="p-4 space-y-3 bg-muted/40 border-b last:border-b-0">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={editForm.name} onChange={editFieldSetter("name")} className="h-8 text-sm rounded-none" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Code</Label>
                      <Input value={editForm.code} onChange={editFieldSetter("code")} className="h-8 text-sm uppercase rounded-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" value={editForm.startDate} onChange={editFieldSetter("startDate")} className="h-8 text-sm rounded-none" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Date</Label>
                      <Input type="date" value={editForm.endDate} onChange={editFieldSetter("endDate")} className="h-8 text-sm rounded-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Term Length</Label>
                    <select
                      value={editForm.termLengthId}
                      onChange={editFieldSetter("termLengthId")}
                      className="w-full h-8 border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">None</option>
                      {termLengths.map((tl) => (
                        <option key={tl.id} value={tl.id}>{tl.label} ({tl.weeks}w)</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-none bg-muted/70" disabled={saving}>
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleUpdate(term.id)} className="rounded-none" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={term.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 bg-muted/20",
                    !term.isActive && "opacity-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{term.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">({term.code})</span>
                      {!term.isActive && <span className="text-xs text-muted-foreground">inactive</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmt(term.startDate)} — {fmt(term.endDate)}
                      {term.termLengthId && termLengths.find((tl) => tl.id === term.termLengthId) && (
                        <> · {termLengths.find((tl) => tl.id === term.termLengthId)!.label}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm" variant="ghost" className="h-8 px-2 text-xs"
                      onClick={() => handleToggle(term.id, term.isActive)}
                      disabled={togglingId === term.id}
                    >
                      {togglingId === term.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : term.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(term)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ id: term.id, name: term.name })}
                      disabled={deletingId === term.id}
                    >
                      {deletingId === term.id
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
      {
        totalPages > 1 && (
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
        )
      }

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete term?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently removed. Terms with sections cannot be deleted — deactivate instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div >
  );
}
