import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, Pencil, Plus, Trash2, UserLock, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconPicker } from '@/components/ui/icon-picker'
import { Switch } from '@/components/ui/switch'
import { DynamicIcon } from '@/components/dynamic-icon'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface QuickLink {
  id: string
  label: string
  url: string
  icon: string | null
  restricted: boolean
  sortOrder: number
}

type StatusFilter = 'all' | 'regular' | 'restricted'
type Mode = 'list' | 'add' | 'edit'

const EMPTY_FORM = { label: '', url: '', icon: '', restricted: false }

const statusChipClass = (active: boolean) =>
  cn(
    'flex-1 py-1 text-xs font-medium transition-colors cursor-pointer border border-yellow-400 text-center',
    active ? 'bg-yellow-400 text-yellow-900' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
  )

export default function QuickLinksPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const backgroundPath: string = (location.state as any)?.backgroundLocation?.pathname ?? '/editor'
  const closePanel = () => navigate(backgroundPath, { replace: true })

  const [mode, setMode] = React.useState<Mode>('list')
  const [editTarget, setEditTarget] = React.useState<QuickLink | null>(null)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')

  const { data: linksData, isLoading } = useQuery<QuickLink[]>({
    queryKey: ['admin-quick-links'],
    queryFn: () => apiFetch<{ data: QuickLink[] }>('/admin/quick-links').then(r => r.data ?? []),
    retry: 1,
  })

  const [localLinks, setLocalLinks] = React.useState<QuickLink[]>([])
  React.useEffect(() => {
    if (linksData !== undefined) setLocalLinks(linksData)
  }, [linksData])

  const filtered = React.useMemo(() =>
    localLinks.filter(l => {
      if (statusFilter === 'regular' && l.restricted) return false
      if (statusFilter === 'restricted' && !l.restricted) return false
      return true
    })
  , [localLinks, statusFilter])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setMode('add')
  }

  function openEdit(link: QuickLink) {
    setForm({ label: link.label, url: link.url, icon: link.icon ?? '', restricted: link.restricted })
    setEditTarget(link)
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
      const res = await apiFetch<{ data: { id: string } }>('/admin/quick-links', { method: 'POST', body: JSON.stringify(form) })
      const newLink: QuickLink = { id: res.data.id, ...form, icon: form.icon || null, sortOrder: localLinks.length }
      setLocalLinks(prev => [...prev, newLink])
      qc.invalidateQueries({ queryKey: ['quick-links'] })
      toast.success('Quick link added.')
      backToList()
    } catch {
      toast.error('Failed to add quick link.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    try {
      await apiFetch(`/admin/quick-links/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(form) })
      setLocalLinks(prev => prev.map(l => l.id === editTarget.id ? { ...l, ...form, icon: form.icon || null } : l))
      qc.invalidateQueries({ queryKey: ['quick-links'] })
      toast.success('Quick link updated.')
      backToList()
    } catch {
      toast.error('Failed to update quick link.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, label } = deleteTarget
    setDeletingId(id)
    setDeleteTarget(null)
    try {
      await apiFetch(`/admin/quick-links/${id}`, { method: 'DELETE' })
      setLocalLinks(prev => prev.filter(l => l.id !== id))
      qc.invalidateQueries({ queryKey: ['quick-links'] })
      toast.success(`Quick link "${label}" deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quick link.')
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
          <button onClick={backToList} className="p-1 rounded-sm text-yellow-800 hover:bg-black/10 hover:text-yellow-900 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-sm font-semibold text-yellow-900 flex-1 truncate">
          {mode === 'add' ? 'Add Quick Link' : mode === 'edit' ? 'Edit Quick Link' : 'Quick Links'}
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
                <Label htmlFor="ql-label" className="text-xs">Label</Label>
                <Input
                  id="ql-label"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="Student Portal"
                  required
                  className="rounded-none h-8 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ql-url" className="text-xs">URL</Label>
                <Input
                  id="ql-url"
                  type="url"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://…"
                  required
                  className="rounded-none h-8 text-sm w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Icon</Label>
                <IconPicker value={form.icon} onChange={name => setForm(f => ({ ...f, icon: name }))} />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="restricted"
                  checked={form.restricted}
                  onCheckedChange={v => setForm(f => ({ ...f, restricted: v }))}
                />
                <Label htmlFor="restricted" className="text-xs cursor-pointer">Restricted — visible to instructors and admins only</Label>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2">
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="w-full rounded-none h-9 bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {mode === 'add' ? 'Create Quick Link' : 'Save Changes'}
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
            <div className="flex gap-1.5">
              {(['all', 'regular', 'restricted'] as StatusFilter[]).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={statusChipClass(statusFilter === s)}>
                  {s === 'all' ? 'All' : s === 'regular' ? 'Regular' : 'Restricted'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Quick links list ─────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-8 text-center px-4">
                {localLinks.length === 0 ? 'No quick links yet — add one above.' : 'No quick links match the current filter.'}
              </p>
            )}
            {!isLoading && filtered.length > 0 && (
              <div>
                {filtered.map(link => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 px-3 py-2.5 border-b border-muted-foreground/25 last:border-b-0"
                  >
                    <DynamicIcon name={link.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate flex items-center gap-1">
                        {link.label}
                        {link.restricted && <UserLock className="h-3 w-3 text-red-500 shrink-0" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-yellow-600 hover:bg-yellow-400/15" onClick={() => openEdit(link)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => setDeleteTarget({ id: link.id, label: link.label })}
                        disabled={deletingId === link.id}
                      >
                        {deletingId === link.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
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
            <DialogTitle>Delete quick link?</DialogTitle>
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
