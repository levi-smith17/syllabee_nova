import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, Search, Trash2, X } from 'lucide-react'
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

const EMPTY_FORM = { email: '', name: '', role: 'INSTRUCTOR' as 'INSTRUCTOR' | 'ADMIN' }

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [showAdd, setShowAdd] = React.useState(false)
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data: users = [], isLoading, isError } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiFetch<{ data: User[] }>('/admin/users').then(r => r.data ?? []),
    retry: 1,
  })

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => (u.email ?? '').toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q))
  }, [users, search])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string; email: string } }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.trim(), name: form.name.trim() || null, role: form.role }),
      })
      qc.setQueryData<User[]>(['users'], prev => [
        ...(prev ?? []),
        { id: res.data.id, email: res.data.email, name: form.name.trim() || null, status: 'FORCE_CHANGE_PASSWORD', enabled: true, createdAt: new Date().toISOString() },
      ])
      toast.success('User invited — they will receive a temporary password by email.')
      setForm(EMPTY_FORM)
      setShowAdd(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      toast.error(msg.includes('409') ? 'A user with that email already exists.' : 'Failed to invite user.')
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

  function statusLabel(user: User) {
    if (!user.enabled) return 'DISABLED'
    return user.status
  }

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
  if (isError) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Failed to load users</div>

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3 flex flex-col gap-1.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0 md:h-8">
            <h1 className="text-xl text-primary font-bold leading-none shrink-0">Users</h1>
            <p className="text-xs text-muted-foreground truncate"> — {users.length} {users.length === 1 ? 'user' : 'users'} registered</p>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-2 shrink-0 rounded-none bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500">
            <Plus className="h-4 w-4" /> Invite User
          </Button>
        </div>

        <div className={cn('flex items-center h-8 border border-transparent bg-background transition-colors focus-within:border-primary', 'md:min-w-36 md:max-w-72')}>
          <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-0 bg-transparent text-xs px-2 outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch('')} className="mr-2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable list ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">

        {showAdd && (
          <form onSubmit={handleInvite} className="border p-5 space-y-4 bg-muted/40 mb-6 max-w-xl">
            <h3 className="font-semibold text-sm">Invite User</h3>
            <p className="text-xs text-muted-foreground">The user will receive an email with a temporary password to set up their account.</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-email">Email</Label>
                <Input id="inv-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="instructor@school.edu" required className="rounded-none" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-name">Name (optional)</Label>
                <Input id="inv-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" className="rounded-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex gap-4">
                {(['INSTRUCTOR', 'ADMIN'] as const).map(r => (
                  <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => setForm(f => ({ ...f, role: r }))} />
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col-reverse md:flex-row gap-2 justify-between">
              <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM) }} disabled={saving}>Cancel</Button>
              <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Invite
              </Button>
            </div>
          </form>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">No users found.</p>
        ) : (
          <div className="divide-y border max-w-3xl">
            {filtered.map(user => {
              const initials = ((user.name ?? user.email ?? '?')[0] ?? '?').toUpperCase()
              const sl = statusLabel(user)
              const statusClass = STATUS_COLORS[sl] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              return (
                <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{user.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusClass}`}>
                      {sl === 'FORCE_CHANGE_PASSWORD' ? 'Pending' : sl === 'CONFIRMED' ? 'Active' : sl.charAt(0) + sl.slice(1).toLowerCase()}
                    </span>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(user)} disabled={deletingId === user.id}>
                      {deletingId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
