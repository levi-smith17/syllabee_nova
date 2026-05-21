import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Term {
  id: string
  name: string
  code: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

interface TermLength { id: string; label: string; weeks: number }

const EMPTY_FORM = { name: '', code: '', startDate: '', endDate: '', termLengthId: '' }
const PAGE_SIZE = 20
type StatusFilter = 'all' | 'active' | 'inactive'
type Mode = 'list' | 'add' | 'edit'

const statusChipClass = (active: boolean) =>
  cn(
    'flex-1 py-1 text-xs font-medium transition-colors cursor-pointer border border-yellow-400 text-center',
    active ? 'bg-yellow-400 text-yellow-900' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
  )

// ── Combobox ───────────────────────────────────────────────────────────────────
function Combobox({ options, value, onChange, placeholder, className }: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  placeholder: string
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
            <p className="px-3 py-2 text-xs text-muted-foreground italic">No results</p>
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

function fmtDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toInputDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

export default function TermsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const backgroundPath: string = (location.state as any)?.backgroundLocation?.pathname ?? '/editor'
  const closePanel = () => navigate(backgroundPath, { replace: true })

  const [mode, setMode] = React.useState<Mode>('list')
  const [editTarget, setEditTarget] = React.useState<Term | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null)

  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [page, setPage] = React.useState(1)

  const { data: terms = [], isLoading } = useQuery<Term[]>({
    queryKey: ['terms'],
    queryFn: () => apiFetch<{ data: Term[] }>('/registration/terms').then(r => r.data ?? []),
    retry: 1,
  })

  const { data: termLengths = [] } = useQuery<TermLength[]>({
    queryKey: ['term-lengths'],
    queryFn: () => apiFetch<{ data: { termLengths: TermLength[] } }>('/settings').then(r => r.data?.termLengths ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return terms
      .filter(t => {
        if (statusFilter === 'active' && !t.isActive) return false
        if (statusFilter === 'inactive' && t.isActive) return false
        if (q && !t.name.toLowerCase().includes(q) && !t.code.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [terms, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setMode('add')
  }

  function openEdit(term: Term) {
    setForm({ name: term.name, code: term.code, startDate: toInputDate(term.startDate), endDate: toInputDate(term.endDate), termLengthId: '' })
    setEditTarget(term)
    setMode('edit')
  }

  function backToList() {
    setMode('list')
    setEditTarget(null)
    setForm(EMPTY_FORM)
  }

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/registration/terms', {
        method: 'POST',
        body: JSON.stringify({ ...form, code: form.code.toUpperCase(), termLengthId: form.termLengthId || undefined }),
      })
      qc.setQueryData<Term[]>(['terms'], prev => [
        ...(prev ?? []),
        { id: res.data.id, name: form.name, code: form.code.toUpperCase(), startDate: form.startDate, endDate: form.endDate, isActive: true, createdAt: new Date().toISOString() },
      ])
      toast.success(`Term "${form.name}" created.`)
      backToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create term.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    try {
      await apiFetch(`/registration/terms/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...form, code: form.code.toUpperCase(), termLengthId: form.termLengthId || undefined }),
      })
      qc.setQueryData<Term[]>(['terms'], prev =>
        (prev ?? []).map(t => t.id === editTarget.id ? { ...t, ...form, code: form.code.toUpperCase() } : t)
      )
      toast.success('Term updated.')
      backToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update term.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id)
    try {
      const term = terms.find(t => t.id === id)!
      await apiFetch(`/registration/terms/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: term.name, code: term.code, startDate: term.startDate, endDate: term.endDate, isActive: !current }),
      })
      qc.setQueryData<Term[]>(['terms'], prev => (prev ?? []).map(t => t.id === id ? { ...t, isActive: !current } : t))
    } catch {
      toast.error('Failed to update status.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    setDeletingId(id)
    setDeleteTarget(null)
    try {
      await apiFetch(`/registration/terms/${id}`, { method: 'DELETE' })
      qc.setQueryData<Term[]>(['terms'], prev => (prev ?? []).filter(t => t.id !== id))
      toast.success(`Term "${name}" deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete term.')
    } finally {
      setDeletingId(null)
    }
  }

  const isFormMode = mode === 'add' || mode === 'edit'
  const canSubmit = termLengths.length === 0 || !!form.termLengthId

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
          {mode === 'add' ? 'Add Term' : mode === 'edit' ? 'Edit Term' : 'Terms'}
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
          <form onSubmit={mode === 'add' ? handleCreate : handleUpdate}>
            <div className="p-4 space-y-4 border-b border-muted-foreground/25">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">Name</Label>
                <Input id="name" value={form.name} onChange={field('name')} placeholder="Fall 2025" className="rounded-none h-8 text-sm w-full" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs">Code</Label>
                <Input id="code" value={form.code} onChange={field('code')} placeholder="2025FS" className="uppercase rounded-none h-8 text-sm w-full" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={field('startDate')} className="rounded-none h-8 text-sm w-full" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs">End Date</Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={field('endDate')} className="rounded-none h-8 text-sm w-full" required />
              </div>
              {termLengths.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Term Length</Label>
                  <Combobox
                    options={termLengths.map(tl => ({ id: tl.id, label: `${tl.label} (${tl.weeks} weeks)` }))}
                    value={form.termLengthId}
                    onChange={id => setForm(f => ({ ...f, termLengthId: id }))}
                    placeholder="None"
                    className="w-full"
                  />
                </div>
              )}
            </div>
            <div className="px-4 py-3 space-y-2">
              <Button
                type="submit"
                size="sm"
                disabled={saving || !canSubmit}
                className="w-full rounded-none h-9 bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {mode === 'add' ? 'Create Term' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={backToList}
                className="w-full rounded-none h-9 bg-muted-foreground/15 hover:bg-muted-foreground/25 text-foreground"
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
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-sm text-xs px-2 py-1.5 disabled:opacity-40 disabled:pointer-events-none hover:text-yellow-600 hover:bg-yellow-400/15 transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ── Term list ─────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-8 text-center px-4">
                {terms.length === 0 ? 'No terms yet — add one above.' : 'No terms match the current filters.'}
              </p>
            )}
            {!isLoading && filtered.length > 0 && (
              <div>
                {paginated.map(term => (
                  <div
                    key={term.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 border-b border-muted-foreground/25 last:border-b-0',
                      !term.isActive && 'opacity-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold">{term.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">({term.code})</span>
                        {!term.isActive && <span className="text-[10px] text-muted-foreground">(inactive)</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{fmtDate(term.startDate)} — {fmtDate(term.endDate)}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-1.5 text-[10px] hover:text-yellow-600 hover:bg-yellow-400/15"
                        onClick={() => handleToggle(term.id, term.isActive)}
                        disabled={togglingId === term.id}
                      >
                        {togglingId === term.id ? <Loader2 className="h-3 w-3 animate-spin" /> : term.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-yellow-600 hover:bg-yellow-400/15" onClick={() => openEdit(term)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setDeleteTarget({ id: term.id, name: term.name })}
                        disabled={deletingId === term.id}
                      >
                        {deletingId === term.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
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
    </div>
  )
}
