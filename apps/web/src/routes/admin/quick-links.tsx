import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Loader2, Pencil, Plus, Trash2, UserLock, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconPicker } from '@/components/ui/icon-picker'
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

const statusChipClass = (active: boolean) =>
  cn(
    'px-3 py-1 text-xs font-medium transition-colors cursor-pointer border border-yellow-400',
    active ? 'bg-yellow-400 text-yellow-900' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
  )

const EMPTY_FORM = { label: '', url: '', icon: '', restricted: false }

function LinkRow({ link, editingId, editForm, setEditForm, setLinks, onStartEdit, onSaveEdit, onCancelEdit, saving }: {
  link: QuickLink
  editingId: string | null
  editForm: typeof EMPTY_FORM
  setEditForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  setLinks: React.Dispatch<React.SetStateAction<QuickLink[]>>
  onStartEdit: (link: QuickLink) => void
  onSaveEdit: (id: string) => void
  onCancelEdit: () => void
  saving: boolean
}) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null)

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, label } = deleteTarget
    setDeletingId(id)
    setDeleteTarget(null)
    try {
      await apiFetch(`/admin/quick-links/${id}`, { method: 'DELETE' })
      setLinks(prev => prev.filter(l => l.id !== id))
      toast.success(`Quick link "${label}" deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete quick link.')
    } finally {
      setDeletingId(null)
    }
  }

  if (editingId === link.id) {
    return (
      <div className="p-4 space-y-3 bg-muted/30 border-b">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="h-8 text-sm rounded-none bg-background" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input type="url" value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} className="h-8 text-sm rounded-none bg-background" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Icon</Label>
          <IconPicker value={editForm.icon} onChange={name => setEditForm(f => ({ ...f, icon: name }))} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id={`restricted-${link.id}`} checked={editForm.restricted} onChange={e => setEditForm(f => ({ ...f, restricted: e.target.checked }))} className="h-4 w-4 accent-primary" />
          <Label htmlFor={`restricted-${link.id}`} className="text-sm font-normal cursor-pointer">
            Restricted — visible to instructors and admins only
          </Label>
        </div>
        <div className="flex flex-col-reverse md:flex-row gap-2 justify-between">
          <Button size="sm" variant="ghost" onClick={onCancelEdit} disabled={saving} className="rounded-none bg-muted/40">
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" onClick={() => onSaveEdit(link.id)} disabled={saving} className="rounded-none">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0 bg-muted/40">
      <DynamicIcon name={link.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="flex items-center text-sm font-medium truncate">
          {link.label}
          {link.restricted && <UserLock className="h-3.5 w-3.5 text-red-900 ml-2" />}
        </p>
        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStartEdit(link)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: link.id, label: link.label })} disabled={deletingId === link.id}>
          {deletingId === link.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

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

export default function QuickLinksPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [showAdd, setShowAdd] = React.useState(false)
  const [addForm, setAddForm] = React.useState(EMPTY_FORM)
  const [adding, setAdding] = React.useState(false)

  const { data: links = [], isLoading, isError } = useQuery<QuickLink[]>({
    queryKey: ['admin-quick-links'],
    queryFn: () => apiFetch<{ data: QuickLink[] }>('/admin/quick-links').then(r => r.data ?? []),
    retry: 1,
  })

  const [localLinks, setLocalLinks] = React.useState<QuickLink[]>([])
  React.useEffect(() => { setLocalLinks(links) }, [links])

  const filtered = React.useMemo(() => {
    return localLinks.filter(l => {
      if (statusFilter === 'regular' && l.restricted) return false
      if (statusFilter === 'restricted' && !l.restricted) return false
      return true
    })
  }, [localLinks, statusFilter])

  function startEdit(link: QuickLink) {
    setEditingId(link.id)
    setEditForm({ label: link.label, url: link.url, icon: link.icon ?? '', restricted: link.restricted })
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    try {
      await apiFetch(`/admin/quick-links/${id}`, { method: 'PUT', body: JSON.stringify(editForm) })
      setLocalLinks(prev => prev.map(l => l.id === id ? { ...l, ...editForm } : l))
      qc.invalidateQueries({ queryKey: ['quick-links'] })
      setEditingId(null)
      toast.success('Quick link updated.')
    } catch {
      toast.error('Failed to update link.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/admin/quick-links', { method: 'POST', body: JSON.stringify(addForm) })
      const newLink: QuickLink = { id: res.data.id, ...addForm, icon: addForm.icon || null, sortOrder: localLinks.length }
      setLocalLinks(prev => [...prev, newLink])
      qc.invalidateQueries({ queryKey: ['quick-links'] })
      toast.success('Quick link added.')
      setAddForm(EMPTY_FORM)
      setShowAdd(false)
    } catch {
      toast.error('Failed to add link.')
    } finally {
      setAdding(false)
    }
  }

  const rowProps = { editingId, editForm, setEditForm, setLinks: setLocalLinks, onStartEdit: startEdit, onSaveEdit: handleSaveEdit, onCancelEdit: () => setEditingId(null), saving }

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  if (isError) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Failed to load quick links</div>

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3 flex flex-col gap-1.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 md:h-8">
            <h1 className="text-xl text-primary font-bold leading-none shrink-0">Quick Links</h1>
            <p className="flex items-center text-xs text-muted-foreground truncate"> — regular links appear for all users. Restricted links (<UserLock className="h-3.5 w-3.5 text-red-900 inline mx-0.5" />) are visible to instructors and admins only.</p>
          </div>
          <Button size="sm" onClick={() => { setShowAdd(true); setEditingId(null) }} className="gap-2 shrink-0 rounded-none">
            <Plus className="h-4 w-4" /> Add Quick Link
          </Button>
        </div>

        <div className="flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center">
          <div className="flex gap-1.5">
            {(['all', 'regular', 'restricted'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`${statusChipClass(statusFilter === s)} grow md:grow-0 h-8`}>
                {s === 'all' ? 'All' : s === 'regular' ? 'Regular' : 'Restricted'}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length === localLinks.length ? `${localLinks.length} quick link${localLinks.length !== 1 ? 's' : ''}` : `${filtered.length} of ${localLinks.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable list ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

        {showAdd && (
          <form onSubmit={handleAdd} className="border p-5 space-y-4 bg-muted/30">
            <h3 className="font-semibold text-sm">Add Quick Link</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-label">Label</Label>
                <Input id="add-label" value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))} placeholder="Student Portal" required className="rounded-none bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-url">URL</Label>
                <Input id="add-url" type="url" value={addForm.url} onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." required className="rounded-none bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <IconPicker value={addForm.icon} onChange={name => setAddForm(f => ({ ...f, icon: name }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="add-restricted" checked={addForm.restricted} onChange={e => setAddForm(f => ({ ...f, restricted: e.target.checked }))} className="h-4 w-4 accent-primary" />
              <Label htmlFor="add-restricted" className="text-sm font-normal cursor-pointer">Restricted — visible to instructors and admins only</Label>
            </div>
            <div className="flex flex-col-reverse md:flex-row gap-2 justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setAddForm(EMPTY_FORM) }} disabled={adding} className="rounded-none bg-muted/40">Cancel</Button>
              <Button type="submit" size="sm" disabled={adding} className="rounded-none">
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Quick Link
              </Button>
            </div>
          </form>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">No quick links match the current filters.</p>
        ) : (
          <div className="border overflow-hidden">
            {filtered.map(link => <LinkRow key={link.id} link={link} {...rowProps} />)}
          </div>
        )}
      </div>
    </div>
  )
}
