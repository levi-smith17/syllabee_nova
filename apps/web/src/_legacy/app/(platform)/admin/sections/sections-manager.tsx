"use client";

import * as React from "react";
import { ChevronDown, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
import { createSection, updateSection, toggleSectionActive, deleteSection } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  sectionCode: string;
  isActive: boolean;
  formatId: string | null;
  formatLabel: string | null;
  meetingDays: string | null;
  meetingTime: string | null;
  roomNumber: string | null;
  instructorId: string | null;
  course: { id: string; code: string; title: string };
  term: { id: string; name: string; code: string; startDate: string; isActive: boolean };
  _count: { sectionProgress: number };
}

interface Props {
  initialSections: Section[];
  courses: { id: string; code: string; title: string }[];
  terms: { id: string; name: string; code: string; startDate: string }[];
  instructors: { id: string; name: string | null; email: string | null }[];
  formats: { id: string; label: string }[];
  codeRules: { digit: string; formatId: string; formatLabel: string }[];
}

const PAGE_SIZE = 20;
type StatusFilter = "all" | "active" | "inactive";

const EMPTY_FORM = {
  courseId: "",
  termId: "",
  sectionCode: "",
  formatId: "",
  instructorId: "",
  roomNumber: "",
  meetingDays: "",
  meetingTime: "",
};

// ── Styles ────────────────────────────────────────────────────────────────────

const statusChipClass = (active: boolean) =>
  cn(
    "px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
    "border border-yellow-400",
    active
      ? "bg-yellow-400 text-yellow-900"
      : "bg-transparent text-foreground hover:bg-yellow-400/10"
  );

const yellowBtn =
  "bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500";

// ── Multi-select filter dropdown ──────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  options: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}

function FilterDropdown({ label, options, selected, onToggle, onClear }: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const count = selected.size;

  return (
    <div ref={ref} className="relative grow md:grow-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-between gap-1.5 h-8 px-2.5 text-xs font-medium border transition-colors border-sidebar-foreground w-full",
          count > 0
            ? "bg-sidebar-foreground text-sidebar"
            : "bg-background text-foreground hover:bg-sidebar-foreground/10"
        )}
      >
        <div className="flex gap-2">
          {label}
          {count > 0 && (
            <span className="flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold bg-sidebar text-sidebar-foreground">
              {count}
            </span>
          )}
        </div>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 ml-[-1] z-50 min-w-40 max-w-64 bg-background border shadow-md">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted select-none"
              >
                <input
                  type="checkbox"
                  checked={selected.has(opt.id)}
                  onChange={() => onToggle(opt.id)}
                  style={{ accentColor: "hsl(var(--sidebar-foreground))" }}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))}
          </div>
          {count > 0 && (
            <div className="border-t">
              <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 w-full">
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Combobox ──────────────────────────────────────────────────────────────────

interface ComboboxProps {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  className?: string;
}

function Combobox({ options, value, onChange, placeholder, className }: ComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const selected = options.find((o) => o.id === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-8 items-center border border-input bg-background px-2 gap-1.5",
          open && "ring-1 ring-ring"
        )}
      >
        <input
          value={open ? query : (selected?.label ?? "")}
          onChange={(e) => { setQuery(e.target.value); if (value) onChange(""); }}
          onFocus={() => { setQuery(""); setOpen(true); }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none min-w-0"
        />
        {value && (
          <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 w-full bg-background border shadow-md max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No results</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(opt.id); setOpen(false); setQuery(""); }}
                className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-muted", value === opt.id && "font-medium bg-muted/50")}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline section form ───────────────────────────────────────────────────────

interface SectionFormProps {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  courses: Props["courses"];
  terms: Props["terms"];
  instructors: Props["instructors"];
  formats: Props["formats"];
  codeRules: Props["codeRules"];
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}

function SectionForm({
  form, setForm, courses, terms, instructors, formats, codeRules,
  saving, onCancel, onSubmit, submitLabel,
}: SectionFormProps) {
  function handleCodeChange(code: string) {
    const firstDigit = code.match(/\d/)?.[0];
    const autoFormatId = firstDigit ? codeRules.find((r) => r.digit === firstDigit)?.formatId : null;
    setForm((f) => ({ ...f, sectionCode: code, ...(autoFormatId ? { formatId: autoFormatId } : {}) }));
  }

  const courseOptions = courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.title}` }));
  const termOptions = terms.map((t) => ({ id: t.id, label: `${t.name} (${t.code})` }));
  const instructorOptions = instructors.map((u) => ({ id: u.id, label: u.name ?? u.email ?? u.id }));

  const selectClass = "w-full h-8 border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="p-4 space-y-3 bg-muted/40 border-b last:border-b-0">
      {/* Course & Term */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Course <span className="text-destructive">*</span></Label>
          <Combobox options={courseOptions} value={form.courseId} onChange={(id) => setForm((f) => ({ ...f, courseId: id }))} placeholder="Search courses…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Term <span className="text-destructive">*</span></Label>
          <Combobox options={termOptions} value={form.termId} onChange={(id) => setForm((f) => ({ ...f, termId: id }))} placeholder="Search terms…" />
        </div>
      </div>

      {/* Section code & format */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Section Code <span className="text-destructive">*</span></Label>
          <Input
            value={form.sectionCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="001"
            className="h-8 text-sm rounded-none"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Format</Label>
          <select
            value={form.formatId}
            onChange={(e) => setForm((f) => ({ ...f, formatId: e.target.value }))}
            className={selectClass}
          >
            <option value="">None</option>
            {formats.map((fmt) => (
              <option key={fmt.id} value={fmt.id}>{fmt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Instructor & room */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Instructor <span className="text-destructive">*</span></Label>
          <Combobox options={instructorOptions} value={form.instructorId} onChange={(id) => setForm((f) => ({ ...f, instructorId: id }))} placeholder="Search instructors…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Room Number</Label>
          <Input
            value={form.roomNumber}
            onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
            placeholder="B204"
            className="h-8 text-sm rounded-none"
          />
        </div>
      </div>

      {/* Meeting schedule */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Meeting Days</Label>
          <Input
            value={form.meetingDays}
            onChange={(e) => setForm((f) => ({ ...f, meetingDays: e.target.value }))}
            placeholder="MWF or TR"
            className="h-8 text-sm rounded-none"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Meeting Time</Label>
          <Input
            value={form.meetingTime}
            onChange={(e) => setForm((f) => ({ ...f, meetingTime: e.target.value }))}
            placeholder="9:00–10:15 AM"
            className="h-8 text-sm rounded-none"
          />
        </div>
      </div>

      <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between pt-1">
        <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button type="button" size="sm" className="rounded-none" onClick={onSubmit} disabled={saving || !form.courseId || !form.termId || !form.sectionCode || !form.instructorId}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SectionsManager({
  initialSections, courses, terms, instructors, formats, codeRules,
}: Props) {
  const [sections, setSections] = React.useState(initialSections);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null);

  // Add form
  const [showAdd, setShowAdd] = React.useState(false);
  const [addForm, setAddForm] = React.useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = React.useState(false);

  // Edit form
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = React.useState(false);

  // Filters
  const [search, setSearch] = React.useState("");
  const [selectedTerms, setSelectedTerms] = React.useState<Set<string>>(new Set());
  const [selectedCourses, setSelectedCourses] = React.useState<Set<string>>(new Set());
  const [selectedFormats, setSelectedFormats] = React.useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);

  const termOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; startDate: string }>();
    for (const s of sections) {
      if (!map.has(s.term.id)) map.set(s.term.id, { id: s.term.id, name: s.term.name, startDate: s.term.startDate });
    }
    return Array.from(map.values()).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [sections]);

  const courseOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; code: string }>();
    for (const s of sections) {
      if (!map.has(s.course.id)) map.set(s.course.id, { id: s.course.id, code: s.course.code });
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [sections]);

  const formatOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) {
      if (s.formatId && s.formatLabel) map.set(s.formatId, s.formatLabel);
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sections]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return sections.filter((s) => {
      if (selectedTerms.size > 0 && !selectedTerms.has(s.term.id)) return false;
      if (selectedCourses.size > 0 && !selectedCourses.has(s.course.id)) return false;
      if (selectedFormats.size > 0 && (s.formatId === null || !selectedFormats.has(s.formatId))) return false;
      if (statusFilter === "active" && !s.isActive) return false;
      if (statusFilter === "inactive" && s.isActive) return false;
      if (q) {
        const label = `${s.course.code}-${s.sectionCode} ${s.course.title} ${s.term.name}`.toLowerCase();
        if (!label.includes(q)) return false;
      }
      return true;
    });
  }, [sections, search, selectedTerms, selectedCourses, selectedFormats, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleTerm(id: string) {
    setSelectedTerms((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setPage(1);
  }
  function toggleCourse(id: string) {
    setSelectedCourses((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setPage(1);
  }
  function toggleFormat(f: string) {
    setSelectedFormats((prev) => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; });
    setPage(1);
  }

  function startEdit(s: Section) {
    setShowAdd(false);
    setEditingId(s.id);
    setEditForm({
      courseId: s.course.id,
      termId: s.term.id,
      sectionCode: s.sectionCode,
      formatId: s.formatId ?? "",
      instructorId: s.instructorId ?? "",
      roomNumber: s.roomNumber ?? "",
      meetingDays: s.meetingDays ?? "",
      meetingTime: s.meetingTime ?? "",
    });
  }

  async function handleCreate() {
    setAddSaving(true);
    try {
      await createSection({
        courseId: addForm.courseId,
        termId: addForm.termId,
        sectionCode: addForm.sectionCode,
        formatId: addForm.formatId || undefined,
        instructorId: addForm.instructorId || undefined,
        roomNumber: addForm.roomNumber || undefined,
        meetingDays: addForm.meetingDays || undefined,
        meetingTime: addForm.meetingTime || undefined,
      });
      toast.success("Section created.");
      setShowAdd(false);
      setAddForm(EMPTY_FORM);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create section.");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingId) return;
    setEditSaving(true);
    try {
      await updateSection(editingId, {
        courseId: editForm.courseId,
        termId: editForm.termId,
        sectionCode: editForm.sectionCode,
        formatId: editForm.formatId || undefined,
        instructorId: editForm.instructorId || undefined,
        roomNumber: editForm.roomNumber || undefined,
        meetingDays: editForm.meetingDays || undefined,
        meetingTime: editForm.meetingTime || undefined,
      });
      toast.success("Section updated.");
      setEditingId(null);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update section.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    try {
      await toggleSectionActive(id, !current);
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !current } : s)));
    } catch {
      toast.error("Failed to update section.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    const { id, label } = deleteTarget;
    setDeletingId(id);
    setDeleteTarget(null);
    try {
      await deleteSection(id);
      setSections((prev) => prev.filter((s) => s.id !== id));
      toast.success(`Section ${label} deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete section.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3 flex flex-col gap-2">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:h-8">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-xl text-primary font-bold leading-none shrink-0">Sections</h1>
            <p className="text-xs text-muted-foreground truncate"> — manage course sections</p>
          </div>
          <Button
            size="sm"
            onClick={() => { setShowAdd(true); setEditingId(null); setAddForm(EMPTY_FORM); }}
            className={cn("gap-2 shrink-0 rounded-none", yellowBtn)}
          >
            <Plus className="h-4 w-4" />
            New Section
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
            <FilterDropdown
              label="Term"
              options={termOptions.map((t) => ({ id: t.id, label: t.name }))}
              selected={selectedTerms}
              onToggle={toggleTerm}
              onClear={() => { setSelectedTerms(new Set()); setPage(1); }}
            />
            <FilterDropdown
              label="Course"
              options={courseOptions.map((c) => ({ id: c.id, label: c.code }))}
              selected={selectedCourses}
              onToggle={toggleCourse}
              onClear={() => { setSelectedCourses(new Set()); setPage(1); }}
            />
            {formatOptions.length > 0 && (
              <FilterDropdown
                label="Format"
                options={formatOptions}
                selected={selectedFormats}
                onToggle={toggleFormat}
                onClear={() => { setSelectedFormats(new Set()); setPage(1); }}
              />
            )}
          </div>
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap md:h-8">
              {filtered.length === sections.length
                ? `${sections.length} section${sections.length !== 1 ? "s" : ""}`
                : `${filtered.length} of ${sections.length}`}
              {totalPages > 1 && ` — page ${page} of ${totalPages}`}
            </span>
          </div>
        </div>

      </div>

      {/* ── Scrollable list ──────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

        {/* Add form */}
        {showAdd && (
          <div className="border bg-muted/40">
            <div className="px-4 pt-3 pb-0">
              <h3 className="font-semibold text-sm">New Section</h3>
            </div>
            <SectionForm
              form={addForm}
              setForm={setAddForm}
              courses={courses}
              terms={terms}
              instructors={instructors}
              formats={formats}
              codeRules={codeRules}
              saving={addSaving}
              onCancel={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }}
              onSubmit={handleCreate}
              submitLabel="Create Section"
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            No sections match the current filters.
          </p>
        ) : (
          <div className="border overflow-hidden">
            {paginated.map((s) =>
              editingId === s.id && s.term.isActive ? (
                <SectionForm
                  key={s.id}
                  form={editForm}
                  setForm={setEditForm}
                  courses={courses}
                  terms={terms}
                  instructors={instructors}
                  formats={formats}
                  codeRules={codeRules}
                  saving={editSaving}
                  onCancel={() => setEditingId(null)}
                  onSubmit={handleUpdate}
                  submitLabel="Save"
                />
              ) : (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 border-b last:border-b-0 bg-muted/20",
                    !s.isActive && "opacity-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {s.course.code}-{s.sectionCode}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.term.name}</span>
                      {!s.isActive && <span className="text-xs text-muted-foreground">(inactive)</span>}
                      {!s.term.isActive && <span className="text-xs text-muted-foreground italic">(term inactive)</span>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {s.course.title}
                      {s.meetingDays && ` · ${s.meetingDays}`}
                      {s.meetingTime && ` ${s.meetingTime}`}
                      {s.roomNumber && ` · ${s.roomNumber}`}
                      {s.formatLabel && ` · ${s.formatLabel}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {s._count.sectionProgress} students
                    </span>
                    {s.term.isActive ? (
                      <>
                        <Button
                          size="sm" variant="ghost" className="h-8 px-2 text-xs"
                          onClick={() => handleToggle(s.id, s.isActive)}
                          disabled={togglingId === s.id}
                        >
                          {togglingId === s.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : s.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: s.id, label: `${s.course.code}-${s.sectionCode}` })}
                          disabled={deletingId === s.id}
                        >
                          {deletingId === s.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Reactivate term to edit</span>
                    )}
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete section?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.label}</strong> will be permanently removed. This cannot be undone.
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
