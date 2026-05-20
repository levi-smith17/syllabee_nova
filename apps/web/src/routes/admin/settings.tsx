import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, ChevronLeft, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────
interface Branding {
  institutionName: string | null
  primaryColor: string | null
  secondaryColor: string | null
  logoUrl: string | null
  faviconUrl: string | null
}
interface Format { id: string; label: string }
interface Rule { id: string; digit: string; formatId: string; formatLabel: string }
interface TermLength { id: string; label: string; weeks: number }
interface Settings { branding: Branding | null; formats: Format[]; rules: Rule[]; termLengths: TermLength[] }

// ── Nav config ────────────────────────────────────────────────
const NAV = [
  { group: 'General', items: [{ id: 'branding', label: 'Branding' }] },
  {
    group: 'Integrations',
    items: [
      { id: 'login-methods', label: 'Login Methods' },
      { id: 'lti', label: 'LTI Platforms' },
    ],
  },
  {
    group: 'Registration',
    items: [
      { id: 'section-formats', label: 'Section Formats' },
      { id: 'section-rules', label: 'Section Rules' },
      { id: 'term-lengths', label: 'Term Lengths' },
    ],
  },
]

// ── Panel header ──────────────────────────────────────────────
function PanelHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="bg-primary px-4 pt-4 pb-4 flex items-center justify-between gap-3 shrink-0">
      <div>
        <h2 className="text-sm font-semibold text-primary-foreground">{title}</h2>
        <p className="text-xs text-primary-foreground/70 mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  )
}

// ── Branding panel ────────────────────────────────────────────
function BrandingPanel({ branding, onSaved }: { branding: Branding | null; onSaved: (b: Branding) => void }) {
  const [form, setForm] = React.useState<Branding>({
    institutionName: '', primaryColor: '', secondaryColor: '', logoUrl: '', faviconUrl: '',
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (branding) setForm({ ...branding })
  }, [branding])

  function set(field: keyof Branding) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/settings/branding', { method: 'PUT', body: JSON.stringify(form) })
      onSaved(form)
      toast.success('Branding saved.')
    } catch {
      toast.error('Failed to save branding.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader title="Branding" description="Adjust the branding settings (app-wide)." />
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="institutionName">Institution Name</Label>
          <Input id="institutionName" value={form.institutionName ?? ''} onChange={set('institutionName')} placeholder="Acme University" className="rounded-none bg-background" required />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <Input id="primaryColor" value={form.primaryColor ?? ''} onChange={set('primaryColor')} placeholder="#1a56db" className="rounded-none bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <Input id="secondaryColor" value={form.secondaryColor ?? ''} onChange={set('secondaryColor')} placeholder="#ffffff" className="rounded-none bg-background" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input id="logoUrl" value={form.logoUrl ?? ''} onChange={set('logoUrl')} placeholder="https://…" className="rounded-none bg-background" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="faviconUrl">Favicon URL</Label>
          <Input id="faviconUrl" value={form.faviconUrl ?? ''} onChange={set('faviconUrl')} placeholder="https://…" className="rounded-none bg-background" />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="rounded-none">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Branding
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Section Formats panel ─────────────────────────────────────
function FormatsPanel({ formats, onFormatsChange }: { formats: Format[]; onFormatsChange: (f: Format[]) => void }) {
  const [showAdd, setShowAdd] = React.useState(false)
  const [label, setLabel] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editLabel, setEditLabel] = React.useState('')
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Format | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/settings/formats', { method: 'POST', body: JSON.stringify({ label: label.trim() }) })
      onFormatsChange([...formats, { id: res.data.id, label: label.trim() }].sort((a, b) => a.label.localeCompare(b.label)))
      toast.success(`Format "${label.trim()}" created.`)
      setLabel('')
      setShowAdd(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create format.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault()
    setSavingEdit(true)
    try {
      await apiFetch(`/settings/formats/${id}`, { method: 'PUT', body: JSON.stringify({ label: editLabel.trim() }) })
      onFormatsChange(formats.map(f => f.id === id ? { ...f, label: editLabel.trim() } : f))
      toast.success('Format updated.')
      setEditingId(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update format.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, label: lbl } = deleteTarget
    setDeleteTarget(null)
    setDeletingId(id)
    try {
      await apiFetch(`/settings/formats/${id}`, { method: 'DELETE' })
      onFormatsChange(formats.filter(f => f.id !== id))
      toast.success(`Format "${lbl}" deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete format.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader
        title="Section Formats"
        description="Define allowed delivery formats for sections."
        action={
          <Button size="sm" onClick={() => setShowAdd(true)} className="hidden sm:inline-flex gap-1.5 rounded-none shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add Format
          </Button>
        }
      />
      <Button onClick={() => setShowAdd(true)} size="sm" className="sm:hidden w-full rounded-none gap-1.5 justify-start">
        <Plus className="h-4 w-4" /> Add Format
      </Button>

      {showAdd && (
        <form onSubmit={handleCreate} className="border-b p-4 space-y-3 bg-muted/40">
          <div className="space-y-1.5">
            <Label>Format Label</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Lecture, Online, Hybrid…" className="bg-background rounded-none" required />
          </div>
          <div className="flex flex-col-reverse md:flex-row gap-2 justify-between">
            <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={() => { setShowAdd(false); setLabel('') }} disabled={saving}>Cancel</Button>
            <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Add
            </Button>
          </div>
        </form>
      )}

      {formats.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground italic py-6 text-center">No formats defined yet.</p>
      ) : (
        <div>
          {formats.map(f =>
            editingId === f.id ? (
              <form key={f.id} onSubmit={e => handleSaveEdit(e, f.id)} className="flex items-center gap-2 px-4 py-2.5 border-b last:border-b-0 bg-muted/40 w-full overflow-hidden">
                <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="flex-1 min-w-0 h-8 text-sm rounded-none bg-background" required />
                <Button type="submit" size="icon" className="h-8 w-8 rounded-none shrink-0" disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none shrink-0 bg-muted/70" onClick={() => setEditingId(null)} disabled={savingEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </form>
            ) : (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 bg-muted/40">
                <span className="flex-1 text-sm font-medium">{f.label}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setEditingId(f.id); setEditLabel(f.label) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => setDeleteTarget(f)} disabled={deletingId === f.id}>
                  {deletingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          )}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete format?</DialogTitle>
            <DialogDescription><strong>{deleteTarget?.label}</strong> will be permanently removed. Formats in use by sections or rules cannot be deleted.</DialogDescription>
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

// ── Section Rules panel ───────────────────────────────────────
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function RulesPanel({ rules, formats, onRulesChange }: { rules: Rule[]; formats: Format[]; onRulesChange: (r: Rule[]) => void }) {
  const [showAdd, setShowAdd] = React.useState(false)
  const [ruleDigit, setRuleDigit] = React.useState('')
  const [ruleFormatId, setRuleFormatId] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editFormatId, setEditFormatId] = React.useState('')
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Rule | null>(null)

  const assignedDigits = new Set(rules.map(r => r.digit))
  const availableDigits = DIGITS.filter(d => !assignedDigits.has(d))
  const canAdd = availableDigits.length > 0 && formats.length > 0

  function startEdit(r: Rule) {
    setEditingId(r.id)
    setEditFormatId(formats.find(f => f.label === r.formatLabel)?.id ?? r.formatId)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/settings/rules', { method: 'POST', body: JSON.stringify({ digit: ruleDigit, formatId: ruleFormatId }) })
      const formatLabel = formats.find(f => f.id === ruleFormatId)?.label ?? ''
      onRulesChange([...rules, { id: res.data.id, digit: ruleDigit, formatId: ruleFormatId, formatLabel }])
      toast.success(`Rule for digit "${ruleDigit}" created.`)
      setRuleDigit('')
      setRuleFormatId('')
      setShowAdd(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rule.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault()
    setSavingEdit(true)
    try {
      await apiFetch(`/settings/rules/${id}`, { method: 'PUT', body: JSON.stringify({ formatId: editFormatId }) })
      const formatLabel = formats.find(f => f.id === editFormatId)?.label ?? ''
      onRulesChange(rules.map(r => r.id === id ? { ...r, formatId: editFormatId, formatLabel } : r))
      toast.success('Rule updated.')
      setEditingId(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update rule.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, digit } = deleteTarget
    setDeleteTarget(null)
    setDeletingId(id)
    try {
      await apiFetch(`/settings/rules/${id}`, { method: 'DELETE' })
      onRulesChange(rules.filter(r => r.id !== id))
      toast.success(`Rule for digit "${digit}" deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete rule.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader
        title="Section Code Rules"
        description="Map the first digit of a section code to a format."
        action={
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={!canAdd} className="hidden sm:inline-flex gap-1.5 rounded-none shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add Rule
          </Button>
        }
      />
      <Button onClick={() => setShowAdd(true)} disabled={!canAdd} size="sm" className="sm:hidden w-full rounded-none gap-1.5 justify-start">
        <Plus className="h-4 w-4" /> Add Rule
      </Button>

      {showAdd && (
        <form onSubmit={handleCreate} className="border-b p-4 space-y-3 bg-muted/40">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Digit</Label>
              <select value={ruleDigit} onChange={e => setRuleDigit(e.target.value)} className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" required>
                <option value="">Select digit…</option>
                {availableDigits.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <select value={ruleFormatId} onChange={e => setRuleFormatId(e.target.value)} className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" required>
                <option value="">Select format…</option>
                {formats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse md:flex-row gap-2 justify-between">
            <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={() => { setShowAdd(false); setRuleDigit(''); setRuleFormatId('') }} disabled={saving}>Cancel</Button>
            <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Add
            </Button>
          </div>
        </form>
      )}

      {rules.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground italic py-6 text-center">No rules defined yet.</p>
      ) : (
        <div>
          {[...rules].sort((a, b) => a.digit.localeCompare(b.digit)).map(r =>
            editingId === r.id ? (
              <form key={r.id} onSubmit={e => handleSaveEdit(e, r.id)} className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40 w-full overflow-hidden">
                <span className="font-mono text-sm font-semibold w-6 shrink-0">{r.digit}</span>
                <span className="text-xs text-muted-foreground shrink-0">→</span>
                <select value={editFormatId} onChange={e => setEditFormatId(e.target.value)} className="flex-1 min-w-0 h-8 border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" required>
                  {formats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <Button type="submit" size="icon" className="h-8 w-8 rounded-none shrink-0" disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none shrink-0 bg-muted/70" onClick={() => setEditingId(null)} disabled={savingEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </form>
            ) : (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                <span className="font-mono text-sm font-semibold w-6 shrink-0">{r.digit}</span>
                <span className="text-xs text-muted-foreground shrink-0">→</span>
                <span className="flex-1 text-sm">{r.formatLabel}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => setDeleteTarget(r)} disabled={deletingId === r.id}>
                  {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          )}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete rule?</DialogTitle>
            <DialogDescription>The rule for digit <strong>{deleteTarget?.digit}</strong> will be permanently removed.</DialogDescription>
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

// ── Term Lengths panel ────────────────────────────────────────
function TermLengthsPanel({ termLengths, onTermLengthsChange }: { termLengths: TermLength[]; onTermLengthsChange: (t: TermLength[]) => void }) {
  const [showAdd, setShowAdd] = React.useState(false)
  const [form, setForm] = React.useState({ label: '', weeks: 16 })
  const [saving, setSaving] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState({ label: '', weeks: 16 })
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<TermLength | null>(null)

  function startEdit(tl: TermLength) { setEditingId(tl.id); setEditForm({ label: tl.label, weeks: tl.weeks }) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await apiFetch<{ data: { id: string } }>('/settings/term-lengths', { method: 'POST', body: JSON.stringify({ label: form.label.trim(), weeks: Number(form.weeks) }) })
      onTermLengthsChange([...termLengths, { id: res.data.id, label: form.label.trim(), weeks: Number(form.weeks) }].sort((a, b) => a.weeks - b.weeks))
      toast.success('Term length added.')
      setForm({ label: '', weeks: 16 })
      setShowAdd(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create term length.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(e: React.FormEvent, id: string) {
    e.preventDefault()
    setSavingEdit(true)
    try {
      await apiFetch(`/settings/term-lengths/${id}`, { method: 'PUT', body: JSON.stringify({ label: editForm.label.trim(), weeks: Number(editForm.weeks) }) })
      onTermLengthsChange(termLengths.map(tl => tl.id === id ? { ...tl, label: editForm.label.trim(), weeks: Number(editForm.weeks) } : tl))
      toast.success('Term length updated.')
      setEditingId(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update term length.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    const { id, label } = deleteTarget
    setDeleteTarget(null)
    setDeletingId(id)
    try {
      await apiFetch(`/settings/term-lengths/${id}`, { method: 'DELETE' })
      onTermLengthsChange(termLengths.filter(tl => tl.id !== id))
      toast.success(`"${label}" deleted.`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete term length.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <PanelHeader
        title="Term Lengths"
        description="Define session durations used when creating terms."
        action={
          <Button size="sm" onClick={() => setShowAdd(true)} className="hidden sm:inline-flex gap-1.5 rounded-none shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add Term Length
          </Button>
        }
      />
      <Button onClick={() => setShowAdd(true)} size="sm" className="sm:hidden w-full rounded-none gap-1.5 justify-start">
        <Plus className="h-4 w-4" /> Add Term Length
      </Button>

      {showAdd && (
        <form onSubmit={handleCreate} className="border-b p-4 space-y-3 bg-muted/40">
          <div className="grid md:grid-cols-[1fr_100px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tl-label">Label</Label>
              <Input id="tl-label" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="16-week" className="rounded-none bg-background" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tl-weeks">Weeks</Label>
              <Input id="tl-weeks" type="number" min={1} value={form.weeks} onChange={e => setForm(f => ({ ...f, weeks: Number(e.target.value) }))} className="rounded-none bg-background" required />
            </div>
          </div>
          <div className="flex flex-col-reverse md:flex-row gap-2 justify-between">
            <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={() => { setShowAdd(false); setForm({ label: '', weeks: 16 }) }} disabled={saving}>Cancel</Button>
            <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Add
            </Button>
          </div>
        </form>
      )}

      {termLengths.length === 0 && !showAdd ? (
        <p className="text-sm text-muted-foreground italic py-6 text-center">No term lengths defined yet.</p>
      ) : (
        <div>
          {termLengths.map(tl =>
            editingId === tl.id ? (
              <form key={tl.id} onSubmit={e => handleSaveEdit(e, tl.id)} className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40 w-full overflow-hidden">
                <Input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="flex-1 h-8 text-sm rounded-none bg-background" required />
                <Input type="number" min={1} value={editForm.weeks} onChange={e => setEditForm(f => ({ ...f, weeks: Number(e.target.value) }))} className="w-20 h-8 text-sm rounded-none shrink-0 bg-background" required />
                <span className="text-xs text-muted-foreground shrink-0">wks</span>
                <Button type="submit" size="icon" className="h-8 w-8 rounded-none shrink-0" disabled={savingEdit}>
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none shrink-0 bg-muted/70" onClick={() => setEditingId(null)} disabled={savingEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </form>
            ) : (
              <div key={tl.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 bg-muted/40">
                <span className="flex-1 text-sm font-medium">{tl.label}</span>
                <span className="text-xs text-muted-foreground shrink-0">{tl.weeks} weeks</span>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startEdit(tl)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => setDeleteTarget(tl)} disabled={deletingId === tl.id}>
                  {deletingId === tl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          )}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete term length?</DialogTitle>
            <DialogDescription><strong>{deleteTarget?.label}</strong> will be permanently removed.</DialogDescription>
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

// ── Placeholder panel ─────────────────────────────────────────
function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col">
      <PanelHeader title={title} description={description} />
      <p className="text-sm text-muted-foreground italic py-8 text-center">Not yet available in this version.</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const qc = useQueryClient()
  const [activePanel, setActivePanel] = React.useState('branding')
  const [mobileShowPanel, setMobileShowPanel] = React.useState(false)

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => apiFetch<{ data: Settings }>('/settings').then(r => r.data!),
    retry: 1,
  })

  function patch(partial: Partial<Settings>) {
    qc.setQueryData<Settings>(['settings'], prev => prev ? { ...prev, ...partial } : prev)
  }

  function selectPanel(id: string) {
    setActivePanel(id)
    setMobileShowPanel(true)
  }

  const navItemClass = (id: string) =>
    cn(
      'w-full text-left px-3 py-2 text-sm transition-colors border-l-2',
      activePanel === id
        ? 'border-sidebar-foreground bg-sidebar-foreground/10 text-sidebar-foreground font-medium'
        : 'border-transparent text-foreground hover:bg-muted'
    )

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Fixed header ─────────────────────────────────────────── */}
      <div className="shrink-0 bg-muted border-b px-6 pt-4 pb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-xl text-primary font-bold leading-none shrink-0">Settings</h1>
          <p className="text-xs text-muted-foreground truncate"> — system configuration</p>
        </div>
      </div>

      {/* ── Two-column body ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">

        {/* Left nav */}
        <div className={cn(
          'flex-col border overflow-y-auto md:w-52 md:shrink-0 bg-muted/40',
          mobileShowPanel ? 'hidden md:flex' : 'flex w-full'
        )}>
          {NAV.map(group => (
            <div key={group.group}>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-primary text-background">
                {group.group}
              </p>
              {group.items.map(item => (
                <button key={item.id} onClick={() => selectPanel(item.id)} className={navItemClass(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Right content panel */}
        <div className={cn(
          'flex-col border overflow-hidden flex-1',
          mobileShowPanel ? 'flex' : 'hidden md:flex'
        )}>
          {/* Mobile back button */}
          <div className="md:hidden shrink-0 border-b flex items-center bg-muted/20">
            <button
              onClick={() => setMobileShowPanel(false)}
              className="flex items-center gap-2 px-4 py-2.5 w-full text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm font-medium text-foreground">Back</span>
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted/40">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading…</div>
            ) : (
              <>
                {activePanel === 'branding' && (
                  <BrandingPanel branding={settings?.branding ?? null} onSaved={branding => patch({ branding })} />
                )}
                {activePanel === 'login-methods' && (
                  <PlaceholderPanel title="Login Methods" description="Configure authentication providers (e.g. Microsoft Entra)." />
                )}
                {activePanel === 'lti' && (
                  <PlaceholderPanel title="LTI Platforms" description="Register LTI 1.3 platforms for LMS integration." />
                )}
                {activePanel === 'section-formats' && (
                  <FormatsPanel formats={settings?.formats ?? []} onFormatsChange={formats => patch({ formats })} />
                )}
                {activePanel === 'section-rules' && (
                  <RulesPanel rules={settings?.rules ?? []} formats={settings?.formats ?? []} onRulesChange={rules => patch({ rules })} />
                )}
                {activePanel === 'term-lengths' && (
                  <TermLengthsPanel termLengths={settings?.termLengths ?? []} onTermLengthsChange={termLengths => patch({ termLengths })} />
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
