import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string | null
  name: string | null
  status: string
  enabled: boolean
  createdAt: string | null
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  FORCE_CHANGE_PASSWORD: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  UNCONFIRMED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  DISABLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

type StatusFilter = 'all' | 'active' | 'pending' | 'disabled'
type Mode = 'list' | 'add' | 'edit'

const EMPTY_ADD = { email: '', name: '', role: 'INSTRUCTOR' as 'INSTRUCTOR' | 'ADMIN' }
const EMPTY_EDIT = { name: '' }

const statusChipClass = (active: boolean) =>
  cn(
    'flex-1 py-1 text-xs font-medium transition-colors cursor-pointer border border-yellow-400 text-center',
    active ? 'bg-yellow-400 text-yellow-900' : 'bg-transparent text-foreground hover:bg-yellow-400/10'
  )

export default function UsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()

  const backgroundPath: string = (location.state as any)?.backgroundLocation?.pathname ?? '/editor'
  const closePanel = () => navigate(backgroundPath, { replace: true })

  const [mode, setMode] = React.useState<Mode>('list')
  const [editTarget, setEditTarget] = React.useState<User | null>(null)
  const [addForm, setAddForm] = React.useState(EMPTY_ADD)
  const [editForm, setEditForm] = React.useState(EMPTY_EDIT)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiFetch<{ data: User[] }>('/admin/users').then(r => r.data ?? []),
    retry: 1,
  })

  function statusLabel(user: User) {
    if (!user.enabled) return 'DISABLED'
    return user.status
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      const sl = statusLabel(u)
      if (statusFilter === 'active' && sl !== 'CONFIRMED') return false
      if (statusFilter === 'pending' && sl !== 'FORCE_CHANGE_PASSWORD') return false
      if (statusFilter === 'disabled' && sl !== 'DISABLED') return false
      if (q && !(u.email ?? '').toLowerCase().includes(q) && !(u.name ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [users, search, statusFilter])

  function openAdd() {
    setAddForm(EMPTY_ADD)
    setEditTarget(null)
    setMode('add')
  }

  function openEdit(user: User) {
    setEditForm({ name: user.name ?? '' })
    setEditTarget(user)
    setMode('edit')
  }

  function backToList() {
    setMode('list')
    setEditTarget(null)
    setAddForm(EMPTY_ADD)
    setEditForm(EMPTY_EDIT)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string; email: string } }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: addForm.email.trim(), name: addForm.name.trim() || null, role: addForm.role }),
      })
      qc.setQueryData<User[]>(['users'], prev => [
        ...(prev ?? []),
        { id: res.data.id, email: res.data.email, name: addForm.name.trim() || null, status: 'FORCE_CHANGE_PASSWORD', enabled: true, createdAt: new Date().toISOString() },
      ])
      toast.success('User invited — they will receive a temporary password by email.')
      backToList()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      toast.error(msg.includes('409') ? 'A user with that email already exists.' : 'Failed to invite user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    try {
      await apiFetch(`/admin/users/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editForm.name.trim() || null }),
      })
      qc.setQueryData<User[]>(['users'], prev =>
        (prev ?? []).map(u => u.id === editTarget.id ? { ...u, name: editForm.name.trim() || null } : u)
      )
      toast.success('User updated.')
      backToList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, name, email } = deleteTarget
    setDeletingId(id)
    setDeleteTarget(null)
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' })
      qc.setQueryData<User[]>(['users'], prev => (prev ?? []).filter(u => u.id !== id))
      toast.success(`${name ?? email ?? 'User'} deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user.')
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
          {mode === 'add' ? 'Invite User' : mode === 'edit' ? 'Edit User' : 'Users'}
        </h1>
        {!isFormMode && (
          <Button
            size="sm"
            onClick={openAdd}
            className="gap-1.5 rounded-none text-xs h-7 px-2.5 bg-sidebar-foreground text-sidebar border-sidebar-foreground hover:bg-sidebar-foreground/90"
          >
            <Plus className="h-3.5 w-3.5" /> Invite
          </Button>
        )}
        <button onClick={closePanel} className="p-1 rounded text-yellow-800 hover:bg-black/10 hover:text-yellow-900 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {isFormMode ? (
        /* ── Add / Edit form ─────────────────────────────────────── */
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={mode === 'add' ? handleInvite : handleUpdate}>
            <div className="p-4 space-y-4 border-b border-muted-foreground/25">
              {mode === 'add' ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="u-email" className="text-xs">Email</Label>
                    <Input
                      id="u-email"
                      type="email"
                      value={addForm.email}
                      onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="instructor@example.com"
                      required
                      className="rounded-none h-8 text-sm w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="u-name" className="text-xs">Name</Label>
                    <Input
                      id="u-name"
                      value={addForm.name}
                      onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="John Doe"
                      required
                      className="rounded-none h-8 text-sm w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Role</Label>
                    <div className="flex flex-col gap-2 pt-0.5">
                      {([
                        {
                          value: 'INSTRUCTOR',
                          label: 'Instructor',
                          description: 'Can create and manage master syllabi and view student progress.',
                        },
                        {
                          value: 'ADMIN',
                          label: 'Admin',
                          description: 'Full access — includes all instructor capabilities plus user management and platform settings.',
                        },
                      ] as const).map(({ value, label, description }) => {
                        const selected = addForm.role === value
                        return (
                          <label
                            key={value}
                            className={cn(
                              'flex items-start gap-3 border p-3 cursor-pointer transition-colors',
                              selected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/40'
                            )}
                          >
                            <input
                              type="radio"
                              name="role"
                              value={value}
                              checked={selected}
                              onChange={() => setAddForm(f => ({ ...f, role: value }))}
                              className="sr-only"
                            />
                            <div className={cn(
                              'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
                              selected ? 'border-primary' : 'border-muted-foreground/40'
                            )}>
                              {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-none mb-1">{label}</p>
                              <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">The user will receive an email with a temporary password.</p>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="text-sm">{editTarget?.email}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="u-edit-name" className="text-xs">Name</Label>
                    <Input
                      id="u-edit-name"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="John Doe"
                      className="rounded-none h-8 text-sm w-full"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-4 py-3 space-y-2">
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="w-full rounded-none h-9 bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500 hover:border-yellow-500"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {mode === 'add' ? 'Send Invite' : 'Save Changes'}
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
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="flex-1 min-w-0 bg-transparent text-xs px-2 outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch('')} className="mr-1.5 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'pending', 'disabled'] as StatusFilter[]).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={statusChipClass(statusFilter === s)}>
                  {s === 'all' ? 'All' : s === 'active' ? 'Active' : s === 'pending' ? 'Pending' : 'Disabled'}
                </button>
              ))}
            </div>
          </div>

          {/* ── User list ─────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-8 text-center px-4">
                {users.length === 0 ? 'No users yet — invite one above.' : 'No users match the current filters.'}
              </p>
            )}
            {!isLoading && filtered.length > 0 && (
              <div>
                {filtered.map(user => {
                  const initials = ((user.name ?? user.email ?? '?')[0] ?? '?').toUpperCase()
                  const sl = statusLabel(user)
                  const statusClass = STATUS_COLORS[sl] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  const statusDisplay = sl === 'FORCE_CHANGE_PASSWORD' ? 'Pending' : sl === 'CONFIRMED' ? 'Active' : sl.charAt(0) + sl.slice(1).toLowerCase()
                  return (
                    <div key={user.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-muted-foreground/25 last:border-b-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{user.name ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>
                          {statusDisplay}
                        </span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-yellow-600 hover:bg-yellow-400/15" onClick={() => openEdit(user)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => setDeleteTarget(user)}
                          disabled={deletingId === user.id}
                        >
                          {deletingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
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
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name ?? deleteTarget?.email}</strong> will be permanently removed from Cognito. This cannot be undone.
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
