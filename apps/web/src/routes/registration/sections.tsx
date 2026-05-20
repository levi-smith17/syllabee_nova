import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
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

const statusChipClass = (active: boolean) =>
  cn(
    'px-3 py-1 text-xs font-medium transition-colors cursor-pointer border border-yellow-400',
    active ? 'bg-yellow-400 text-yellow-900' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
  )
const yellowBtn = 'bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500'

// ── Multi-select filter dropdown ───────────────────────────────────────────────
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
    <div ref={ref} className="relative grow md:grow-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between gap-1.5 h-8 px-2.5 text-xs font-medium border transition-colors border-sidebar-foreground w-full',
          count > 0 ? 'bg-sidebar-foreground text-sidebar' : 'bg-background text-foreground hover:bg-sidebar-foreground/10'
        )}
      >
        <div className="flex gap-2">
          {label}
          {count > 0 && <span className="flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold bg-sidebar text-sidebar-foreground">{count}</span>}
        </div>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-40 max-w-64 bg-background border shadow-md">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map(opt => (
              <label key={opt.id} className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted select-none">
                <input type="checkbox" checked={selected.has(opt.id)} onChange={() => onToggle(opt.id)} className="h-3.5 w-3.5" />
                <span className="truncate">{opt.label}</span>
              </label>
            ))}
          </div>
          {count > 0 && (
            <div className="border-t">
              <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 w-full">Clear</button>
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

// ── Section form (add + edit) ──────────────────────────────────────────────────
function SectionForm({ form, setForm, courses, terms, instructors, formats, codeRules, saving, onCancel, onSubmit, submitLabel }: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  courses: Course[]
  terms: Term[]
  instructors: User[]
  formats: Format[]
  codeRules: CodeRule[]
  saving: boolean
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
}) {
  function handleCodeChange(code: string) {
    const firstDigit = code.match(/\d/)?.[0]
    const autoFormatId = firstDigit ? codeRules.find(r => r.digit === firstDigit)?.formatId : null
    setForm(f => ({ ...f, sectionCode: code, ...(autoFormatId ? { formatId: autoFormatId } : {}) }))
  }
  const courseOptions = courses.map(c => ({ id: c.id, label: `${c.code} — ${c.title}` }))
  const termOptions = terms.map(t => ({ id: t.id, label: `${t.name} (${t.code})` }))
  const instructorOptions = instructors.map(u => ({ id: u.id, label: u.name ?? u.email ?? u.id }))
  const selectClass = 'w-full h-8 border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
  return (
    <div className="p-4 space-y-3 bg-muted/40 border-b last:border-b-0">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Course <span className="text-destructive">*</span></Label>
          <Combobox options={courseOptions} value={form.courseId} onChange={id => setForm(f => ({ ...f, courseId: id }))} placeholder="Search courses…" emptyMessage="No courses — add them in Registration first" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Term <span className="text-destructive">*</span></Label>
          <Combobox options={termOptions} value={form.termId} onChange={id => setForm(f => ({ ...f, termId: id }))} placeholder="Search terms…" emptyMessage="No terms — add them in Registration first" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Section Code <span className="text-destructive">*</span></Label>
          <Input value={form.sectionCode} onChange={e => handleCodeChange(e.target.value)} placeholder="001" className="h-8 text-sm rounded-none" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Format</Label>
          <select value={form.formatId} onChange={e => setForm(f => ({ ...f, formatId: e.target.value }))} className={selectClass}>
            <option value="">None</option>
            {formats.map(fmt => <option key={fmt.id} value={fmt.id}>{fmt.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Instructor <span className="text-destructive">*</span></Label>
          <Combobox options={instructorOptions} value={form.instructorId} onChange={id => setForm(f => ({ ...f, instructorId: id }))} placeholder="Search instructors…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Room Number</Label>
          <Input value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="B204" className="h-8 text-sm rounded-none" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Meeting Days</Label>
          <Input value={form.meetingDays} onChange={e => setForm(f => ({ ...f, meetingDays: e.target.value }))} placeholder="MWF or TR" className="h-8 text-sm rounded-none" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Meeting Time</Label>
          <Input value={form.meetingTime} onChange={e => setForm(f => ({ ...f, meetingTime: e.target.value }))} placeholder="9:00–10:15 AM" className="h-8 text-sm rounded-none" />
        </div>
      </div>
      <div className="flex flex-col-reverse md:flex-row gap-2 justify-between pt-1">
        <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4" /> Cancel
        </Button>
        <Button type="button" size="sm" className="rounded-none" onClick={onSubmit} disabled={saving || !form.courseId || !form.termId || !form.sectionCode || !form.instructorId}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
        </Button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SectionsPage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = React.useState(false)
  const [addForm, setAddForm] = React.useState(EMPTY_FORM)
  const [addSaving, setAddSaving] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null)

  const [search, setSearch] = React.useState('')
  const [selectedTerms, setSelectedTerms] = React.useState<Set<string>>(new Set())
  const [selectedCourses, setSelectedCourses] = React.useState<Set<string>>(new Set())
  const [selectedFormats, setSelectedFormats] = React.useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [page, setPage] = React.useState(1)

  const { data: sections = [], isLoading, isError } = useQuery<Section[]>({
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

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]))
  const termMap = Object.fromEntries(terms.map(t => [t.id, t]))

  const termFilterOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; startDate: string }>()
    for (const s of sections) {
      const t = termMap[s.termId]
      if (t && !map.has(s.termId)) map.set(s.termId, { id: s.termId, name: t.name, startDate: t.startDate })
    }
    return Array.from(map.values()).sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [sections, termMap])

  const courseFilterOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; code: string }>()
    for (const s of sections) {
      const c = courseMap[s.courseId]
      if (c && !map.has(s.courseId)) map.set(s.courseId, { id: s.courseId, code: c.code })
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [sections, courseMap])

  const formatFilterOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sections) {
      if (s.formatId) {
        const fmt = formats.find(f => f.id === s.formatId)
        if (fmt) map.set(s.formatId, fmt.label)
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [sections, formats])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return sections.filter(s => {
      if (selectedTerms.size > 0 && !selectedTerms.has(s.termId)) return false
      if (selectedCourses.size > 0 && !selectedCourses.has(s.courseId)) return false
      if (selectedFormats.size > 0 && (s.formatId === null || !selectedFormats.has(s.formatId))) return false
      if (statusFilter === 'active' && !s.isActive) return false
      if (statusFilter === 'inactive' && s.isActive) return false
      if (q) {
        const course = courseMap[s.courseId]
        const term = termMap[s.termId]
        const label = `${course?.code ?? ''}-${s.sectionCode} ${course?.title ?? ''} ${term?.name ?? ''}`.toLowerCase()
        if (!label.includes(q)) return false
      }
      return true
    })
  }, [sections, search, selectedTerms, selectedCourses, selectedFormats, statusFilter, courseMap, termMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function startEdit(s: Section) {
    setShowAdd(false)
    setEditingId(s.id)
    setEditForm({ courseId: s.courseId, termId: s.termId, sectionCode: s.sectionCode, formatId: s.formatId ?? '', instructorId: s.instructorId ?? '', roomNumber: s.roomNumber ?? '', meetingDays: s.meetingDays ?? '', meetingTime: s.meetingTime ?? '' })
  }

  async function handleCreate() {
    setAddSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/registration/sections', {
        method: 'POST',
        body: JSON.stringify({
          courseId: addForm.courseId, termId: addForm.termId, sectionCode: addForm.sectionCode,
          formatId: addForm.formatId || null, instructorId: addForm.instructorId || null,
          roomNumber: addForm.roomNumber || null, meetingDays: addForm.meetingDays || null, meetingTime: addForm.meetingTime || null,
        }),
      })
      qc.setQueryData<Section[]>(['sections'], prev => [
        ...(prev ?? []),
        { id: res.data.id, courseId: addForm.courseId, termId: addForm.termId, sectionCode: addForm.sectionCode, formatId: addForm.formatId || null, instructorId: addForm.instructorId || null, roomNumber: addForm.roomNumber || null, meetingDays: addForm.meetingDays || null, meetingTime: addForm.meetingTime || null, isActive: true, createdAt: new Date().toISOString() },
      ])
      toast.success('Section created.')
      setShowAdd(false)
      setAddForm(EMPTY_FORM)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create section.')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editingId) return
    setEditSaving(true)
    try {
      await apiFetch(`/registration/sections/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          courseId: editForm.courseId, termId: editForm.termId, sectionCode: editForm.sectionCode,
          formatId: editForm.formatId || null, instructorId: editForm.instructorId || null,
          roomNumber: editForm.roomNumber || null, meetingDays: editForm.meetingDays || null, meetingTime: editForm.meetingTime || null,
        }),
      })
      qc.setQueryData<Section[]>(['sections'], prev =>
        (prev ?? []).map(s => s.id === editingId ? { ...s, ...editForm, formatId: editForm.formatId || null, instructorId: editForm.instructorId || null, roomNumber: editForm.roomNumber || null, meetingDays: editForm.meetingDays || null, meetingTime: editForm.meetingTime || null } : s)
      )
      toast.success('Section updated.')
      setEditingId(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update section.')
    } finally {
      setEditSaving(false)
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

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3 flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:h-8">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-xl text-primary font-bold leading-none shrink-0">Sections</h1>
            <p className="text-xs text-muted-foreground truncate"> — manage course sections</p>
          </div>
          <Button size="sm" onClick={() => { setShowAdd(true); setEditingId(null); setAddForm(EMPTY_FORM) }} className={cn('gap-2 shrink-0 rounded-none', yellowBtn)}>
            <Plus className="h-4 w-4" /> New Section
          </Button>
        </div>

        <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center">
          <div className={cn('flex items-center h-8 border border-transparent bg-background transition-colors focus-within:border-primary', 'md:min-w-36 md:max-w-56')}>
            <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-xs px-2 outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="mr-2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }} className={`${statusChipClass(statusFilter === s)} grow md:grow-0 h-8`}>
                {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <FilterDropdown label="Term" options={termFilterOptions.map(t => ({ id: t.id, label: t.name }))} selected={selectedTerms} onToggle={id => { setSelectedTerms(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }); setPage(1) }} onClear={() => { setSelectedTerms(new Set()); setPage(1) }} />
            <FilterDropdown label="Course" options={courseFilterOptions.map(c => ({ id: c.id, label: c.code }))} selected={selectedCourses} onToggle={id => { setSelectedCourses(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }); setPage(1) }} onClear={() => { setSelectedCourses(new Set()); setPage(1) }} />
            {formatFilterOptions.length > 0 && (
              <FilterDropdown label="Format" options={formatFilterOptions} selected={selectedFormats} onToggle={id => { setSelectedFormats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }); setPage(1) }} onClear={() => { setSelectedFormats(new Set()); setPage(1) }} />
            )}
          </div>
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length === sections.length ? `${sections.length} section${sections.length !== 1 ? 's' : ''}` : `${filtered.length} of ${sections.length}`}
              {totalPages > 1 && ` — page ${page} of ${totalPages}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable list ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {showAdd && (
          <div className="border bg-muted/40">
            <div className="px-4 pt-3 pb-0"><h3 className="font-semibold text-sm">New Section</h3></div>
            <SectionForm form={addForm} setForm={setAddForm} courses={relevantCourses} terms={terms} instructors={users} formats={formats} codeRules={codeRules} saving={addSaving} onCancel={() => { setShowAdd(false); setAddForm(EMPTY_FORM) }} onSubmit={handleCreate} submitLabel="Create Section" />
          </div>
        )}

        {isLoading && <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>}

        {!isLoading && (filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">No sections match the current filters.</p>
        ) : (
          <div className="border overflow-hidden">
            {paginated.map(s => {
              const course = courseMap[s.courseId]
              const term = termMap[s.termId]
              const termIsActive = term?.isActive ?? true
              const fmt = formats.find(f => f.id === s.formatId)
              return editingId === s.id && termIsActive ? (
                <SectionForm key={s.id} form={editForm} setForm={setEditForm} courses={relevantCourses} terms={terms} instructors={users} formats={formats} codeRules={codeRules} saving={editSaving} onCancel={() => setEditingId(null)} onSubmit={handleUpdate} submitLabel="Save" />
              ) : (
                <div key={s.id} className={cn('flex items-center gap-4 px-5 py-4 border-b last:border-b-0 bg-muted/20', !s.isActive && 'opacity-50')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{course?.code ?? '?'}-{s.sectionCode}</span>
                      <span className="text-xs text-muted-foreground">{term?.name ?? '?'}</span>
                      {!s.isActive && <span className="text-xs text-muted-foreground">(inactive)</span>}
                      {!termIsActive && <span className="text-xs text-muted-foreground italic">(term inactive)</span>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {course?.title ?? ''}
                      {s.meetingDays && ` · ${s.meetingDays}`}
                      {s.meetingTime && ` ${s.meetingTime}`}
                      {s.roomNumber && ` · ${s.roomNumber}`}
                      {fmt && ` · ${fmt.label}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {termIsActive ? (
                      <>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => handleToggle(s.id, s.isActive)} disabled={togglingId === s.id}>
                          {togglingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : s.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: s.id, label: `${course?.code ?? '?'}-${s.sectionCode}` })} disabled={deletingId === s.id}>
                          {deletingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Reactivate term to edit</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Pagination footer ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="shrink-0 bg-muted border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <Button size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`${yellowBtn} rounded-none`}>Previous</Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                  acc.push(p); return acc
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                  : <button key={p} onClick={() => setPage(p as number)} className={cn('h-7 w-7 text-xs font-medium transition-colors', page === p ? 'bg-yellow-400 text-yellow-900' : 'hover:bg-muted-foreground/10 text-foreground')}>{p}</button>
                )}
            </div>
            <Button size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`${yellowBtn} rounded-none`}>Next</Button>
          </div>
        </div>
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
