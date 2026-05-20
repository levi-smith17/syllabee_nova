import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Branding {
  institutionName: string | null
  primaryColor: string | null
  secondaryColor: string | null
  logoUrl: string | null
  faviconUrl: string | null
}

interface Format {
  id: string
  label: string
}

interface Rule {
  id: string
  digit: string
  formatId: string
  formatLabel: string
}

interface TermLength {
  id: string
  label: string
  weeks: number
}

interface Settings {
  branding: Branding | null
  formats: Format[]
  rules: Rule[]
  termLengths: TermLength[]
}

// ── Branding section ─────────────────────────────────────────
function BrandingSection({ branding, onSaved }: { branding: Branding | null; onSaved: (b: Branding) => void }) {
  const [form, setForm] = useState<Branding>({
    institutionName: '', primaryColor: '', secondaryColor: '', logoUrl: '', faviconUrl: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (branding) setForm({ ...branding })
  }, [branding])

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch('/settings/branding', { method: 'PUT', body: JSON.stringify(form) })
      onSaved(form)
      toast.success('Branding saved')
    } catch {
      toast.error('Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Branding</h2>
      <div className="grid gap-4 max-w-xl">
        <div className="grid gap-1.5">
          <Label>Institution Name</Label>
          <Input value={form.institutionName ?? ''} onChange={e => setForm(f => ({ ...f, institutionName: e.target.value }))} placeholder="Acme University" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Primary Color</Label>
            <Input value={form.primaryColor ?? ''} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} placeholder="#000000" />
          </div>
          <div className="grid gap-1.5">
            <Label>Secondary Color</Label>
            <Input value={form.secondaryColor ?? ''} onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))} placeholder="#ffffff" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Logo URL</Label>
          <Input value={form.logoUrl ?? ''} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://…" />
        </div>
        <div className="grid gap-1.5">
          <Label>Favicon URL</Label>
          <Input value={form.faviconUrl ?? ''} onChange={e => setForm(f => ({ ...f, faviconUrl: e.target.value }))} placeholder="https://…" />
        </div>
        <div>
          <Button onClick={handleSave} disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500">
            {saving ? 'Saving…' : 'Save Branding'}
          </Button>
        </div>
      </div>
    </section>
  )
}

// ── Formats section ──────────────────────────────────────────
function FormatsSection({ formats, onFormatsChange }: { formats: Format[]; onFormatsChange: (f: Format[]) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Format | null>(null)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Format | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setLabel(''); setDialogOpen(true) }
  function openEdit(f: Format) { setEditing(f); setLabel(f.label); setDialogOpen(true) }

  async function handleSave() {
    if (!label.trim()) { toast.error('Label is required'); return }
    setSaving(true)
    try {
      if (editing) {
        await apiFetch(`/settings/formats/${editing.id}`, { method: 'PUT', body: JSON.stringify({ label: label.trim() }) })
        onFormatsChange(formats.map(f => f.id === editing.id ? { ...f, label: label.trim() } : f))
        toast.success('Format updated')
      } else {
        const res = await apiFetch<{ data: { id: string } }>('/settings/formats', { method: 'POST', body: JSON.stringify({ label: label.trim() }) })
        onFormatsChange([...formats, { id: res.data.id, label: label.trim() }])
        toast.success('Format created')
      }
      setDialogOpen(false)
    } catch {
      toast.error(editing ? 'Failed to update format' : 'Failed to create format')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`/settings/formats/${deleteTarget.id}`, { method: 'DELETE' })
      onFormatsChange(formats.filter(f => f.id !== deleteTarget.id))
      toast.success('Format deleted')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err?.message?.includes('409') ? 'Format is in use and cannot be deleted' : 'Failed to delete format')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Section Formats</h2>
        <Button size="sm" onClick={openCreate} className="bg-yellow-400 text-black hover:bg-yellow-500 h-7 text-xs px-2">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      <div className="border max-w-xl">
        {formats.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No formats yet</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {formats.map(f => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">{f.label}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(f)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Format' : 'Add Format'}</DialogTitle></DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="fmtLabel">Label</Label>
            <Input id="fmtLabel" value={label} onChange={e => setLabel(e.target.value)} placeholder="Online" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Format</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.label}</strong>? Formats in use by sections or rules cannot be deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// ── Rules section ────────────────────────────────────────────
function RulesSection({ rules, formats, onRulesChange }: { rules: Rule[]; formats: Format[]; onRulesChange: (r: Rule[]) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [digit, setDigit] = useState('')
  const [formatId, setFormatId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setDigit(''); setFormatId(''); setDialogOpen(true) }
  function openEdit(r: Rule) { setEditing(r); setDigit(r.digit); setFormatId(r.formatId); setDialogOpen(true) }

  async function handleSave() {
    if (!formatId) { toast.error('Format is required'); return }
    if (!/^[0-9]$/.test(digit) && !editing) { toast.error('Digit must be a single number 0–9'); return }
    setSaving(true)
    try {
      const formatLabel = formats.find(f => f.id === formatId)?.label ?? ''
      if (editing) {
        await apiFetch(`/settings/rules/${editing.id}`, { method: 'PUT', body: JSON.stringify({ formatId }) })
        onRulesChange(rules.map(r => r.id === editing.id ? { ...r, formatId, formatLabel } : r))
        toast.success('Rule updated')
      } else {
        const res = await apiFetch<{ data: { id: string } }>('/settings/rules', { method: 'POST', body: JSON.stringify({ digit, formatId }) })
        onRulesChange([...rules, { id: res.data.id, digit, formatId, formatLabel }])
        toast.success('Rule created')
      }
      setDialogOpen(false)
    } catch (err: any) {
      toast.error(err?.message?.includes('409') ? `A rule for digit "${digit}" already exists` : (editing ? 'Failed to update rule' : 'Failed to create rule'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`/settings/rules/${deleteTarget.id}`, { method: 'DELETE' })
      onRulesChange(rules.filter(r => r.id !== deleteTarget.id))
      toast.success('Rule deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete rule')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Section Code Rules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Maps a section code's leading digit to a format</p>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-yellow-400 text-black hover:bg-yellow-500 h-7 text-xs px-2">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      <div className="border max-w-xl">
        {rules.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No rules yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Digit</th>
                <th className="text-left px-4 py-2 font-medium">Format</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono font-medium">{r.digit}</td>
                  <td className="px-4 py-2">{r.formatLabel}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Rule' : 'Add Rule'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {!editing && (
              <div className="grid gap-1.5">
                <Label htmlFor="digit">Digit (0–9)</Label>
                <Input id="digit" maxLength={1} value={digit} onChange={e => setDigit(e.target.value)} placeholder="1" />
              </div>
            )}
            {editing && (
              <p className="text-sm text-muted-foreground">Digit: <strong className="font-mono">{editing.digit}</strong> (cannot be changed)</p>
            )}
            <div className="grid gap-1.5">
              <Label>Format</Label>
              <select
                value={formatId}
                onChange={e => setFormatId(e.target.value)}
                className="h-9 border border-input bg-background px-3 text-sm"
              >
                <option value="">Select format…</option>
                {formats.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Rule</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete rule for digit <strong className="font-mono">{deleteTarget?.digit}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// ── Term Lengths section ─────────────────────────────────────
function TermLengthsSection({ termLengths, onTermLengthsChange }: { termLengths: TermLength[]; onTermLengthsChange: (t: TermLength[]) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TermLength | null>(null)
  const [form, setForm] = useState({ label: '', weeks: '' })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TermLength | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openCreate() { setEditing(null); setForm({ label: '', weeks: '' }); setDialogOpen(true) }
  function openEdit(t: TermLength) { setEditing(t); setForm({ label: t.label, weeks: String(t.weeks) }); setDialogOpen(true) }

  async function handleSave() {
    const weeks = Number(form.weeks)
    if (!form.label.trim()) { toast.error('Label is required'); return }
    if (!Number.isInteger(weeks) || weeks < 1) { toast.error('Weeks must be a positive integer'); return }
    setSaving(true)
    try {
      if (editing) {
        await apiFetch(`/settings/term-lengths/${editing.id}`, { method: 'PUT', body: JSON.stringify({ label: form.label.trim(), weeks }) })
        onTermLengthsChange(termLengths.map(t => t.id === editing.id ? { ...t, label: form.label.trim(), weeks } : t))
        toast.success('Term length updated')
      } else {
        const res = await apiFetch<{ data: { id: string } }>('/settings/term-lengths', { method: 'POST', body: JSON.stringify({ label: form.label.trim(), weeks }) })
        onTermLengthsChange([...termLengths, { id: res.data.id, label: form.label.trim(), weeks }])
        toast.success('Term length created')
      }
      setDialogOpen(false)
    } catch {
      toast.error(editing ? 'Failed to update term length' : 'Failed to create term length')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiFetch(`/settings/term-lengths/${deleteTarget.id}`, { method: 'DELETE' })
      onTermLengthsChange(termLengths.filter(t => t.id !== deleteTarget.id))
      toast.success('Term length deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete term length')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Term Lengths</h2>
        <Button size="sm" onClick={openCreate} className="bg-yellow-400 text-black hover:bg-yellow-500 h-7 text-xs px-2">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      <div className="border max-w-xl">
        {termLengths.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">No term lengths yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Label</th>
                <th className="text-left px-4 py-2 font-medium">Weeks</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {termLengths.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2">{t.label}</td>
                  <td className="px-4 py-2">{t.weeks}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Term Length' : 'Add Term Length'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="tlLabel">Label</Label>
              <Input id="tlLabel" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Full Term" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tlWeeks">Weeks</Label>
              <Input id="tlWeeks" type="number" min={1} value={form.weeks} onChange={e => setForm(f => ({ ...f, weeks: e.target.value }))} placeholder="16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-yellow-400 text-black hover:bg-yellow-500">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Term Length</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.label}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const qc = useQueryClient()

  const { data: settings, isLoading, isError } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => apiFetch<{ data: Settings }>('/settings').then(r => r.data!),
    retry: 1,
  })

  function patch(partial: Partial<Settings>) {
    qc.setQueryData<Settings>(['settings'], prev => prev ? { ...prev, ...partial } : prev)
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (isError) return <div className="p-6 text-destructive">Failed to load settings</div>

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <BrandingSection
        branding={settings?.branding ?? null}
        onSaved={branding => patch({ branding })}
      />

      <div className="border-t my-6" />

      <FormatsSection
        formats={settings?.formats ?? []}
        onFormatsChange={formats => patch({ formats })}
      />

      <div className="border-t my-6" />

      <RulesSection
        rules={settings?.rules ?? []}
        formats={settings?.formats ?? []}
        onRulesChange={rules => patch({ rules })}
      />

      <div className="border-t my-6" />

      <TermLengthsSection
        termLengths={settings?.termLengths ?? []}
        onTermLengthsChange={termLengths => patch({ termLengths })}
      />
    </div>
  )
}
