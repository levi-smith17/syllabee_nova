import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface Course {
  id: string
  code: string
  title: string
  description: string | null
  creditHours: number
  isInternship: boolean
  isActive: boolean
  createdAt: string
}

const EMPTY_FORM = { code: '', title: '', description: '', creditHours: 3, isInternship: false }
const PAGE_SIZE = 20
type StatusFilter = 'all' | 'active' | 'inactive'
type Mode = 'list' | 'add' | 'edit'

const statusChipClass = (active: boolean) =>
  cn(
    'flex-1 py-1 text-xs font-medium transition-colors cursor-pointer border border-primary text-center',
    active ? 'bg-primary text-black' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
  )

// ── FilterDropdown (multi-select) ─────────────────────────────────────────────
function FilterDropdown({ label, options, selected, onToggle, onClear }: {
  label: string
  options: { id: string; label: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])
  const count = selected.size
  return (
    <div ref={ref} className="relative w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between gap-1.5 h-7 px-2.5 text-xs font-medium border transition-colors border-sidebar-foreground w-full',
          count > 0 ? 'bg-sidebar-foreground text-sidebar' : 'bg-background/60 text-foreground hover:bg-sidebar-foreground/10'
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
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 w-full bg-background border shadow-md">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map(opt => (
              <label key={opt.id} className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer bg-background hover:bg-muted select-none">
                <input
                  type="checkbox"
                  checked={selected.has(opt.id)}
                  onChange={() => onToggle(opt.id)}
                  style={{ accentColor: 'hsl(var(--sidebar-foreground))' }}
                  className="h-3.5 w-3.5 rounded-none border-muted/50"
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
  )
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const backgroundPath: string = (location.state as any)?.backgroundLocation?.pathname ?? '/editor'
  const closePanel = () => navigate(backgroundPath, { replace: true })

  const [mode, setMode] = React.useState<Mode>('list')
  const [editTarget, setEditTarget] = React.useState<Course | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; code: string } | null>(null)

  const [search, setSearch] = React.useState('')
  const [prefixFilter, setPrefixFilter] = React.useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [page, setPage] = React.useState(1)

  const { data: coursesData, isLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiFetch<{ data: Course[] }>('/registration/courses').then(r => r.data ?? []),
    retry: 1,
  })
  const courses = coursesData ?? []

  const prefixes = React.useMemo(() => {
    const set = new Set<string>()
    for (const c of courses) {
      const p = c.code.split('-')[0]
      if (p) set.add(p)
    }
    return Array.from(set).sort()
  }, [courses])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return courses
      .filter(c => {
        if (prefixFilter.size > 0 && !prefixFilter.has(c.code.split('-')[0])) return false
        if (statusFilter === 'active' && !c.isActive) return false
        if (statusFilter === 'inactive' && c.isActive) return false
        if (q && !c.code.toLowerCase().includes(q) && !c.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => a.code.localeCompare(b.code) || a.title.localeCompare(b.title))
  }, [courses, search, prefixFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setMode('add')
  }

  function openEdit(course: Course) {
    setForm({
      code: course.code,
      title: course.title,
      description: course.description ?? '',
      creditHours: course.creditHours,
      isInternship: course.isInternship,
    })
    setEditTarget(course)
    setMode('edit')
  }

  function backToList() {
    setMode('list')
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/registration/courses', {
        method: 'POST',
        body: JSON.stringify({ ...form, code: form.code.toUpperCase(), creditHours: Number(form.creditHours) }),
      })
      const newCourse: Course = {
        id: res.data.id,
        code: form.code.toUpperCase(),
        title: form.title,
        description: form.description || null,
        creditHours: Number(form.creditHours),
        isInternship: form.isInternship,
        isActive: true,
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData<Course[]>(['courses'], prev => [...(prev ?? []), newCourse])
      toast.success(`Course ${form.code.toUpperCase()} created.`)
      backToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create course.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    try {
      await apiFetch(`/registration/courses/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, code: form.code.toUpperCase(), creditHours: Number(form.creditHours) }),
      })
      qc.setQueryData<Course[]>(['courses'], prev =>
        (prev ?? []).map(c => c.id === editTarget.id
          ? { ...c, ...form, code: form.code.toUpperCase(), creditHours: Number(form.creditHours) }
          : c
        )
      )
      toast.success('Course updated.')
      backToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update course.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id)
    try {
      const course = courses.find(c => c.id === id)!
      await apiFetch(`/registration/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ code: course.code, title: course.title, creditHours: course.creditHours, isActive: !current }),
      })
      qc.setQueryData<Course[]>(['courses'], prev =>
        (prev ?? []).map(c => c.id === id ? { ...c, isActive: !current } : c)
      )
    } catch {
      toast.error('Failed to update status.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, code } = deleteTarget
    setDeletingId(id)
    setDeleteTarget(null)
    try {
      await apiFetch(`/registration/courses/${id}`, { method: 'DELETE' })
      qc.setQueryData<Course[]>(['courses'], prev => (prev ?? []).filter(c => c.id !== id))
      toast.success(`Course ${code} deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete course.')
    } finally {
      setDeletingId(null)
    }
  }

  const isFormMode = mode === 'add' || mode === 'edit'

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Panel header ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-primary border-b border-primary px-4 py-3 flex items-center gap-2">
        {isFormMode && (
          <button onClick={backToList} className="p-1 rounded-sm text-black hover:bg-black/10 hover:text-yellow-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-sm font-semibold text-black flex-1 truncate flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          {mode === 'add' ? 'Add Course' : mode === 'edit' ? 'Edit Course' : 'Courses'}
        </h1>
        {!isFormMode && (
          <Button
            size="sm"
            onClick={openAdd}
            className="gap-1.5 rounded-none text-xs h-7 px-2.5 bg-sidebar-foreground text-sidebar border-sidebar-foreground hover:bg-sidebar-foreground/90"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
        <button onClick={closePanel} className="p-1 rounded text-black hover:bg-black/10 hover:text-yellow-900 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {isFormMode ? (
        /* ── Add / Edit form ─────────────────────────────────────── */
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={mode === 'add' ? handleCreate : handleUpdate}>
            <div className="p-4 space-y-4 border-b border-muted-foreground/25">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs">Course Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="CIS-121S"
                  className="uppercase rounded-none h-8 text-sm w-full"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Introduction to Programming"
                  className="rounded-none h-8 text-sm w-full"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditHours" className="text-xs">Credit Hours</Label>
                <Input
                  id="creditHours"
                  type="number"
                  min={0}
                  max={12}
                  value={form.creditHours}
                  onChange={e => setForm(f => ({ ...f, creditHours: Number(e.target.value) }))}
                  className="rounded-none h-8 text-sm w-full"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">Description (optional)</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief course description…"
                  className="rounded-none h-8 text-sm w-full "
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="isInternship"
                  checked={form.isInternship}
                  onCheckedChange={v => setForm(f => ({ ...f, isInternship: v }))}
                />
                <Label htmlFor="isInternship" className="text-xs cursor-pointer">Internship-eligible course</Label>
              </div>
            </div>

            {/* ── Buttons ─────────────────────────────────────────── */}
            <div className="px-4 py-3 space-y-2">
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80 hover:text-black transition-colors"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {mode === 'add' ? 'Create Course' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={backToList}
                className="w-full rounded-none h-9 bg-muted-foreground/15 hover:bg-muted-foreground/25 text-foreground transition-colors"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* ── Filter row ────────────────────────────────────────── */}
          <div className="shrink-0 border-b border-muted-foreground/25 p-3 flex flex-col gap-2">
            <div className="flex items-center h-7 border border-transparent bg-background/60 transition-colors focus-within:border-primary">
              <Search className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search…"
                className="flex-1 min-w-0 bg-transparent text-xs px-2 outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1) }} className="mr-1.5 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }} className={statusChipClass(statusFilter === s)}>
                  {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
            {prefixes.length > 0 && (
              <FilterDropdown
                label="Code Prefix"
                options={prefixes.map(p => ({ id: p, label: p }))}
                selected={prefixFilter}
                onToggle={p => { setPrefixFilter(prev => { const next = new Set(prev); next.has(p) ? next.delete(p) : next.add(p); return next }); setPage(1) }}
                onClear={() => { setPrefixFilter(new Set()); setPage(1) }}
              />
            )}
          </div>

          {/* ── Pagination row ────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="shrink-0 border-b border-muted-foreground/25 px-3 py-1.5 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-sm text-xs px-2 py-1.5 disabled:opacity-40 disabled:pointer-events-none hover:text-yellow-600 hover:bg-yellow-400/15 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-sm text-xs px-2 py-1.5 disabled:opacity-40 disabled:pointer-events-none hover:text-yellow-600 hover:bg-yellow-400/15 transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ── Course list ───────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-8 text-center px-4">
                {courses.length === 0 ? 'No courses yet — add one above.' : 'No courses match the current filters.'}
              </p>
            )}

            {!isLoading && filtered.length > 0 && (
              <div>
                {paginated.map(course => (
                  <div
                    key={course.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 border-b border-muted-foreground/25 last:border-b-0',
                      !course.isActive && 'opacity-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold">{course.code}</span>
                        {course.isInternship && (
                          <span className="text-[10px] text-orange-600 dark:text-orange-400">Internship</span>
                        )}
                        {!course.isActive && (
                          <span className="text-[10px] text-muted-foreground">(inactive)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {course.title}
                        <span className="ml-1 opacity-60">· {course.creditHours} cr</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-1.5 text-[10px] hover:text-yellow-600 hover:bg-yellow-400/15"
                        onClick={() => handleToggle(course.id, course.isActive)}
                        disabled={togglingId === course.id}
                      >
                        {togglingId === course.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : course.isActive ? 'Deactivate' : 'Activate'
                        }
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:text-yellow-600 hover:bg-yellow-400/15"
                        onClick={() => openEdit(course)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setDeleteTarget({ id: course.id, code: course.code })}
                        disabled={deletingId === course.id}
                      >
                        {deletingId === course.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Trash2 className="h-3 w-3" />
                        }
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete course?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.code}</strong> will be permanently removed. This cannot be undone. Sections referencing this course must be removed first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
