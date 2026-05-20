import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronLeft, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { useRelevantCourses } from '@/hooks/use-relevant-courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Section {
  id: string
  courseId: string
  termId: string
  sectionCode: string
  formatId: string | null
  instructorId: string | null
  roomNumber: string | null
  meetingDays: string | null
  meetingTime: string | null
  isActive: boolean
  createdAt: string
}

interface Course { id: string; code: string; title: string }
interface Term { id: string; name: string; code: string; startDate: string; isActive: boolean }
interface User { id: string; name: string | null; email: string | null }
interface Format { id: string; label: string }
interface CodeRule { digit: string; formatId: string; formatLabel: string }

const EMPTY_FORM = { courseId: '', termId: '', sectionCode: '', formatId: '', instructorId: '', roomNumber: '', meetingDays: '', meetingTime: '' }
const PAGE_SIZE = 20
type StatusFilter = 'all' | 'active' | 'inactive'
type Mode = 'list' | 'add' | 'edit'

const statusChipClass = (active: boolean) =>
  cn(
    'flex-1 py-1 text-xs font-medium transition-colors cursor-pointer border border-yellow-400 text-center',
    active ? 'bg-yellow-400 text-yellow-900' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
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
              <label key={opt.id} className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted select-none">
                <input
                  type="checkbox"
                  checked={selected.has(opt.id)}
                  onChange={() => onToggle(opt.id)}
                  style={{ accentColor: 'hsl(var(--sidebar-foreground))' }}
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
  )
}

// ── Combobox ───────────────────────────────────────────────────────────────────
function Combobox({ options, value, onChange, placeholder, emptyMessage = 'No results', className }: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  placeholder: string
  emptyMessage?: string
  className?: string
}) {
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])
  const selected = options.find(o => o.id === value)
  const filtered = query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options
  const noItemsMessage = options.length === 0 ? emptyMessage : 'No results'
  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className={cn('flex h-8 items-center border border-input bg-background px-2 gap-1.5', open && 'ring-1 ring-ring')}>
        <input
          value={open ? query : (selected?.label ?? '')}
          onChange={e => { setQuery(e.target.value); if (value) onChange('') }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none min-w-0 placeholder:text-muted-foreground"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); setQuery('') }} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 w-full bg-background border shadow-md max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground italic">{noItemsMessage}</p>
          ) : filtered.map(opt => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(opt.id); setOpen(false); setQuery('') }}
              className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-muted', value === opt.id && 'font-medium bg-muted/50')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section form fields ────────────────────────────────────────────────────────
function SectionFields({ form, setForm, courses, terms, instructors, formats, codeRules }: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  courses: Course[]
  terms: Term[]
  instructors: User[]
  formats: Format[]
  codeRules: CodeRule[]
}) {
  function handleCodeChange(code: string) {
    const firstDigit = code.match(/\d/)?.[0]
    const autoFormatId = firstDigit ? codeRules.find(r => r.digit === firstDigit)?.formatId : null
    setForm(f => ({ ...f, sectionCode: code, ...(autoFormatId ? { formatId: autoFormatId } : {}) }))
  }
  const courseOptions = courses.slice().sort((a, b) => a.code.localeCompare(b.code)).map(c => ({ id: c.id, label: `${c.code} — ${c.title}` }))
  const activeTermOptions = terms.filter(t => t.isActive).sort((a, b) => b.code.localeCompare(a.code)).map(t => ({ id: t.id, label: `${t.name} (${t.code})` }))
  const instructorOptions = instructors.map(u => ({ id: u.id, label: u.name ?? u.email ?? u.id }))
  const formatOptions = formats.map(f => ({ id: f.id, label: f.label }))
  return (
    <div className="p-4 space-y-4 border-b border-muted-foreground/25">
      <div className="space-y-1.5">
        <Label className="text-xs">Course <span className="text-destructive">*</span></Label>
        <Combobox options={courseOptions} value={form.courseId} onChange={id => setForm(f => ({ ...f, courseId: id }))} placeholder="Search courses…" emptyMessage="No active courses found" className="w-full" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Term <span className="text-destructive">*</span></Label>
        <Combobox options={activeTermOptions} value={form.termId} onChange={id => setForm(f => ({ ...f, termId: id }))} placeholder="Search terms…" emptyMessage="No active terms found" className="w-full" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Section Code <span className="text-destructive">*</span></Label>
        <Input value={form.sectionCode} onChange={e => handleCodeChange(e.target.value)} placeholder="001" className="h-8 text-sm rounded-none w-full bg-background" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Format</Label>
        <Combobox options={formatOptions} value={form.formatId} onChange={id => setForm(f => ({ ...f, formatId: id }))} placeholder="None" className="w-full" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Instructor <span className="text-destructive">*</span></Label>
        <Combobox options={instructorOptions} value={form.instructorId} onChange={id => setForm(f => ({ ...f, instructorId: id }))} placeholder="Search instructors…" className="w-full" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Meeting Days</Label>
        <Input value={form.meetingDays} onChange={e => setForm(f => ({ ...f, meetingDays: e.target.value }))} placeholder="MWF or TR" className="h-8 text-sm rounded-none w-full bg-background" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Meeting Time</Label>
        <Input value={form.meetingTime} onChange={e => setForm(f => ({ ...f, meetingTime: e.target.value }))} placeholder="9:00–10:15 AM" className="h-8 text-sm rounded-none w-full bg-background" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Room Number</Label>
        <Input value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="B204" className="h-8 text-sm rounded-none w-full bg-background" />
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SectionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const backgroundPath: string = (location.state as any)?.backgroundLocation?.pathname ?? '/editor'
  const closePanel = () => navigate(backgroundPath, { replace: true })

  const [mode, setMode] = React.useState<Mode>('list')
  const [editTarget, setEditTarget] = React.useState<Section | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null)

  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [termFilter, setTermFilter] = React.useState<Set<string>>(new Set())
  const [page, setPage] = React.useState(1)

  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: ['sections'],
    queryFn: () => apiFetch<{ data: Section[] }>('/registration/sections').then(r => r.data ?? []),
    retry: 1,
  })
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => apiFetch<{ data: Course[] }>('/registration/courses').then(r => r.data ?? []),
    staleTime: 1000 * 60 * 5,
  })
  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ['terms'],
    queryFn: () => apiFetch<{ data: Term[] }>('/registration/terms').then(r => r.data ?? []),
    staleTime: 1000 * 60 * 5,
  })
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiFetch<{ data: User[] }>('/admin/users').then(r => r.data ?? []),
    staleTime: 1000 * 60 * 5,
  })
  const { data: settings } = useQuery<{ formats: Format[]; rules: CodeRule[] }>({
    queryKey: ['settings-slim'],
    queryFn: () => apiFetch<{ data: { formats: Format[]; rules: CodeRule[] } }>('/settings').then(r => ({ formats: r.data?.formats ?? [], rules: r.data?.rules ?? [] })),
    staleTime: 1000 * 60 * 5,
  })

  const formats = settings?.formats ?? []
  const codeRules = settings?.rules ?? []
  const relevantCourses = useRelevantCourses()

  const courseMap = React.useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses])
  const termMap = React.useMemo(() => Object.fromEntries(terms.map(t => [t.id, t])), [terms])

  const termOptions = React.useMemo(() => {
    const seen = new Map<string, { id: string; name: string; startDate: string }>()
    for (const s of sections) {
      const t = termMap[s.termId]
      if (t && !seen.has(s.termId)) seen.set(s.termId, { id: s.termId, name: t.name, startDate: t.startDate })
    }
    return Array.from(seen.values()).sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [sections, termMap])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return sections
      .filter(s => {
        const termIsActive = termMap[s.termId]?.isActive ?? true
        if (termFilter.size > 0 && !termFilter.has(s.termId)) return false
        if (statusFilter === 'active' && (!s.isActive || !termIsActive)) return false
        if (statusFilter === 'inactive' && (s.isActive && termIsActive)) return false
        if (q) {
          const course = courseMap[s.courseId]
          const term = termMap[s.termId]
          const label = `${course?.code ?? ''}-${s.sectionCode} ${course?.title ?? ''} ${term?.name ?? ''}`.toLowerCase()
          if (!label.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const ta = termMap[a.termId]?.startDate ?? ''
        const tb = termMap[b.termId]?.startDate ?? ''
        if (tb !== ta) return tb.localeCompare(ta)
        const ca = courseMap[a.courseId]?.code ?? ''
        const cb = courseMap[b.courseId]?.code ?? ''
        return ca.localeCompare(cb) || a.sectionCode.localeCompare(b.sectionCode)
      })
  }, [sections, search, termFilter, statusFilter, courseMap, termMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setMode('add')
  }

  function openEdit(s: Section) {
    const term = termMap[s.termId]
    if (!term?.isActive) return
    setForm({ courseId: s.courseId, termId: s.termId, sectionCode: s.sectionCode, formatId: s.formatId ?? '', instructorId: s.instructorId ?? '', roomNumber: s.roomNumber ?? '', meetingDays: s.meetingDays ?? '', meetingTime: s.meetingTime ?? '' })
    setEditTarget(s)
    setMode('edit')
  }

  function backToList() {
    setMode('list')
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/registration/sections', {
        method: 'POST',
        body: JSON.stringify({ courseId: form.courseId, termId: form.termId, sectionCode: form.sectionCode, formatId: form.formatId || null, instructorId: form.instructorId || null, roomNumber: form.roomNumber || null, meetingDays: form.meetingDays || null, meetingTime: form.meetingTime || null }),
      })
      qc.setQueryData<Section[]>(['sections'], prev => [
        ...(prev ?? []),
        { id: res.data.id, courseId: form.courseId, termId: form.termId, sectionCode: form.sectionCode, formatId: form.formatId || null, instructorId: form.instructorId || null, roomNumber: form.roomNumber || null, meetingDays: form.meetingDays || null, meetingTime: form.meetingTime || null, isActive: true, createdAt: new Date().toISOString() },
      ])
      toast.success('Section created.')
      backToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create section.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editTarget) return
    setSaving(true)
    try {
      await apiFetch(`/registration/sections/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ courseId: form.courseId, termId: form.termId, sectionCode: form.sectionCode, formatId: form.formatId || null, instructorId: form.instructorId || null, roomNumber: form.roomNumber || null, meetingDays: form.meetingDays || null, meetingTime: form.meetingTime || null }),
      })
      qc.setQueryData<Section[]>(['sections'], prev =>
        (prev ?? []).map(s => s.id === editTarget.id ? { ...s, ...form, formatId: form.formatId || null, instructorId: form.instructorId || null, roomNumber: form.roomNumber || null, meetingDays: form.meetingDays || null, meetingTime: form.meetingTime || null } : s)
      )
      toast.success('Section updated.')
      backToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update section.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id)
    try {
      const s = sections.find(sec => sec.id === id)!
      await apiFetch(`/registration/sections/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ courseId: s.courseId, termId: s.termId, sectionCode: s.sectionCode, isActive: !current }),
      })
      qc.setQueryData<Section[]>(['sections'], prev => (prev ?? []).map(s => s.id === id ? { ...s, isActive: !current } : s))
    } catch {
      toast.error('Failed to update section.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, label } = deleteTarget
    setDeletingId(id)
    setDeleteTarget(null)
    try {
      await apiFetch(`/registration/sections/${id}`, { method: 'DELETE' })
      qc.setQueryData<Section[]>(['sections'], prev => (prev ?? []).filter(s => s.id !== id))
      toast.success(`Section ${label} deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete section.')
    } finally {
      setDeletingId(null)
    }
  }

  const isFormMode = mode === 'add' || mode === 'edit'
  const canSubmit = !!form.courseId && !!form.termId && !!form.sectionCode && !!form.instructorId

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Panel header ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-yellow-400 border-b border-yellow-500 px-4 py-3 flex items-center gap-2">
        {isFormMode && (
          <button onClick={backToList} className="p-1 rounded-sm text-yellow-800 hover:bg-black/10 hover:text-yellow-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-sm font-semibold text-yellow-900 flex-1 truncate">
          {mode === 'add' ? 'Add Section' : mode === 'edit' ? 'Edit Section' : 'Sections'}
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
        <button onClick={closePanel} className="p-1 rounded text-yellow-800 hover:bg-black/10 hover:text-yellow-900 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {isFormMode ? (
        /* ── Add / Edit form ─────────────────────────────────────── */
        <div className="flex-1 min-h-0 overflow-y-auto">
          <SectionFields
            form={form}
            setForm={setForm}
            courses={relevantCourses}
            terms={terms}
            instructors={users}
            formats={formats}
            codeRules={codeRules}
          />
          <div className="px-4 py-3 space-y-2">
            <Button
              onClick={mode === 'add' ? handleCreate : handleUpdate}
              disabled={saving || !canSubmit}
              className="w-full rounded-none h-9 bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mode === 'add' ? 'Create Section' : 'Save Changes'}
            </Button>
            <Button
              variant="ghost"
              disabled={saving}
              onClick={backToList}
              className="w-full rounded-none h-9 bg-muted-foreground/25 hover:bg-muted-foreground/35 text-foreground"
            >
              Cancel
            </Button>
          </div>
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
            {termOptions.length > 0 && (
              <FilterDropdown
                label="Term"
                options={termOptions.map(t => ({ id: t.id, label: t.name }))}
                selected={termFilter}
                onToggle={id => { setTermFilter(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next }); setPage(1) }}
                onClear={() => { setTermFilter(new Set()); setPage(1) }}
              />
            )}
          </div>

          {/* ── Pagination row ────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="shrink-0 border-b border-muted-foreground/25 px-3 py-1.5 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-sm text-xs px-2 py-1.5 disabled:opacity-40 disabled:pointer-events-none hover:text-yellow-600 hover:bg-yellow-400/15 transition-colors"
              >
                ‹ Prev
              </button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-sm text-xs px-2 py-1.5 disabled:opacity-40 disabled:pointer-events-none hover:text-yellow-600 hover:bg-yellow-400/15 transition-colors"
              >
                Next ›
              </button>
            </div>
          )}

          {/* ── Section list ─────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-8 text-center px-4">
                {sections.length === 0 ? 'No sections yet — add one above.' : 'No sections match the current filters.'}
              </p>
            )}
            {!isLoading && filtered.length > 0 && (
              <div>
                {paginated.map(s => {
                  const course = courseMap[s.courseId]
                  const term = termMap[s.termId]
                  const termIsActive = term?.isActive ?? true
                  const fmt = formats.find(f => f.id === s.formatId)
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 border-b border-muted-foreground/25 last:border-b-0',
                        (!s.isActive || !termIsActive) && 'opacity-50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-semibold">{course?.code ?? '?'}-{s.sectionCode}</span>
                          <span className="text-[10px] text-muted-foreground">{term?.name ?? '?'}</span>
                          {!s.isActive && <span className="text-[10px] text-muted-foreground">(inactive)</span>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {course?.title ?? ''}
                          {s.meetingDays && ` · ${s.meetingDays}`}
                          {s.meetingTime && ` ${s.meetingTime}`}
                          {fmt && ` · ${fmt.label}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {termIsActive ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5 text-[10px] hover:text-yellow-600 hover:bg-yellow-400/15"
                              onClick={() => handleToggle(s.id, s.isActive)}
                              disabled={togglingId === s.id}
                            >
                              {togglingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : s.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-yellow-600 hover:bg-yellow-400/15" onClick={() => openEdit(s)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => setDeleteTarget({ id: s.id, label: `${course?.code ?? '?'}-${s.sectionCode}` })}
                              disabled={deletingId === s.id}
                            >
                              {deletingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </Button>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic px-1">Term inactive</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete section?</DialogTitle>
            <DialogDescription><strong>{deleteTarget?.label}</strong> will be permanently removed. This cannot be undone.</DialogDescription>
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
