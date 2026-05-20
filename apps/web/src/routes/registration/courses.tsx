import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, ChevronLeft, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
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
    'flex-1 py-1 text-xs font-medium transition-colors cursor-pointer border border-yellow-400 text-center',
    active ? 'bg-yellow-400 text-yellow-900' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
  )

const prefixChipClass = (active: boolean) =>
  cn(
    'flex-1 py-1 text-xs font-medium transition-colors cursor-pointer border text-center',
    active
      ? 'bg-sidebar-foreground text-sidebar border-sidebar-foreground'
      : 'text-sidebar-foreground border-sidebar-foreground/40 hover:bg-sidebar-foreground/10'
  )

export default function CoursesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [mode, setMode] = React.useState<Mode>('list')
  const [editTarget, setEditTarget] = React.useState<Course | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; code: string } | null>(null)

  const [search, setSearch] = React.useState('')
  const [prefixFilter, setPrefixFilter] = React.useState('all')
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
    return courses.filter(c => {
      if (prefixFilter !== 'all' && !c.code.startsWith(prefixFilter + '-')) return false
      if (statusFilter === 'active' && !c.isActive) return false
      if (statusFilter === 'inactive' && c.isActive) return false
      if (q && !c.code.toLowerCase().includes(q) && !c.title.toLowerCase().includes(q)) return false
      return true
    })
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
      <div className="shrink-0 bg-yellow-400 border-b border-yellow-500 px-4 py-3 flex items-center gap-2">
        {isFormMode && (
          <button onClick={backToList} className="p-1 text-yellow-800 hover:text-yellow-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-sm font-semibold text-yellow-900 flex-1 truncate">
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
        <button onClick={() => navigate(-1)} className="p-1 text-yellow-800 hover:text-yellow-900 transition-colors">
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
                  className="uppercase rounded-none h-8 text-sm w-full bg-background"
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
                  className="rounded-none h-8 text-sm w-full bg-background"
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
                  className="rounded-none h-8 text-sm w-full bg-background"
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
                  className="rounded-none h-8 text-sm w-full bg-background"
                />
              </div>
              <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                <span className={cn(
                  'relative flex h-5 w-5 shrink-0 items-center justify-center border border-background bg-background transition-colors shadow-sm',
                  form.isInternship ? 'border-ring' : ''
                )}>
                  <input
                    type="checkbox"
                    checked={form.isInternship}
                    onChange={e => setForm(f => ({ ...f, isInternship: e.target.checked }))}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {form.isInternship && <Check className="h-3.5 w-3.5 text-ring stroke-[3]" />}
                </span>
                Internship-eligible course
              </label>
            </div>

            {/* ── Buttons ─────────────────────────────────────────── */}
            <div className="px-4 py-3 space-y-2">
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="w-full rounded-none h-9 bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500"
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
                className="w-full rounded-none h-9 bg-muted-foreground/25 hover:bg-muted-foreground/35 text-foreground"
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
              <div className="flex gap-1.5">
                <button onClick={() => { setPrefixFilter('all'); setPage(1) }} className={prefixChipClass(prefixFilter === 'all')}>All</button>
                {prefixes.map(p => (
                  <button key={p} onClick={() => { setPrefixFilter(p === prefixFilter ? 'all' : p); setPage(1) }} className={prefixChipClass(prefixFilter === p)}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Pagination row ────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="shrink-0 border-b px-3 py-1.5 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs px-2 py-0.5 disabled:opacity-40 hover:text-primary transition-colors"
              >
                ‹ Prev
              </button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-xs px-2 py-0.5 disabled:opacity-40 hover:text-primary transition-colors"
              >
                Next ›
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
                      'flex items-center gap-2 px-3 py-2.5 border-b last:border-b-0',
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
                        className="h-7 px-1.5 text-[10px]"
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
                        className="h-7 w-7"
                        onClick={() => openEdit(course)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
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
