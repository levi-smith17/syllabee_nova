import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    ArrowLeft, Plus, Printer, CheckSquare, Trash2, MapPin, ShieldCheck, ShieldOff, Loader2,
} from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type {
    Internship, InternshipLocation, InternshipJournalEntry, InternshipSettings, InternshipStatus,
} from '@syllabee/types'

// ── Types ───────────────────────────────────────────────────────────────────

interface DetailData {
    internship: Internship
    locations: InternshipLocation[]
    journalEntries: InternshipJournalEntry[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<InternshipStatus, string> = {
    PENDING:   'bg-yellow-100 text-yellow-800',
    ACTIVE:    'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    WITHDRAWN: 'bg-gray-100 text-gray-700',
}

const STATUSES: InternshipStatus[] = ['PENDING', 'ACTIVE', 'COMPLETED', 'WITHDRAWN']

// 15-min increment options for a full day
const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
        TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
}

const EMPTY_LOCATION = {
    employerName: '', address: '', city: '', state: '', zip: '',
    supervisorName: '', supervisorEmail: '', supervisorPhone: '',
}

const EMPTY_JOURNAL = {
    locationId: '', title: '', description: '', date: '', timeStart: '09:00', timeEnd: '17:00',
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InternshipStatus }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
            {status}
        </span>
    )
}

function minutesBetween(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
}

function formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ── Main component ───────────────────────────────────────────────────────────

export default function InternshipDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const qc = useQueryClient()

    // Selection state for batch verify
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

    // Dialog state
    const [showLocationDialog, setShowLocationDialog] = React.useState(false)
    const [showJournalDialog, setShowJournalDialog] = React.useState(false)
    const [deleteJournalId, setDeleteJournalId] = React.useState<string | null>(null)

    // Forms
    const [locationForm, setLocationForm] = React.useState(EMPTY_LOCATION)
    const [journalForm, setJournalForm] = React.useState(EMPTY_JOURNAL)

    // ── Data ──────────────────────────────────────────────────────────────────

    const { data, isLoading, isError } = useQuery({
        queryKey: ['internship', id],
        queryFn: () =>
            apiFetch<{ data: DetailData }>(`/internship/${id}`).then(r => r.data!),
        enabled: !!id,
    })

    const { data: settings } = useQuery({
        queryKey: ['internship-settings'],
        queryFn: () => apiFetch<{ data: InternshipSettings }>('/internship/settings').then(r => r.data),
    })

    const requiredHours = settings?.requiredHours ?? 224

    // ── Mutations ─────────────────────────────────────────────────────────────

    const updateStatus = useMutation({
        mutationFn: (status: InternshipStatus) =>
            apiFetch(`/internship/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['internship', id] }); toast.success('Status updated') },
        onError: () => toast.error('Failed to update status'),
    })

    const createLocation = useMutation({
        mutationFn: (body: typeof EMPTY_LOCATION) =>
            apiFetch(`/internship/${id}/locations`, { method: 'POST', body: JSON.stringify(body) }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['internship', id] })
            toast.success('Location added')
            setShowLocationDialog(false)
            setLocationForm(EMPTY_LOCATION)
        },
        onError: () => toast.error('Failed to add location'),
    })

    const toggleValidated = useMutation({
        mutationFn: ({ locationId, validated }: { locationId: string; validated: boolean }) =>
            apiFetch(`/internship/${id}/locations/${locationId}`, {
                method: 'PUT',
                body: JSON.stringify({ validated }),
            }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['internship', id] }); toast.success('Location updated') },
        onError: () => toast.error('Failed to update location'),
    })

    const createJournal = useMutation({
        mutationFn: (body: typeof EMPTY_JOURNAL) =>
            apiFetch(`/internship/${id}/journal`, { method: 'POST', body: JSON.stringify(body) }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['internship', id] })
            toast.success('Journal entry added')
            setShowJournalDialog(false)
            setJournalForm(EMPTY_JOURNAL)
        },
        onError: (err: any) => toast.error(err?.message ?? 'Failed to add journal entry'),
    })

    const deleteJournal = useMutation({
        mutationFn: (entryId: string) =>
            apiFetch(`/internship/${id}/journal/${entryId}`, { method: 'DELETE' }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['internship', id] })
            toast.success('Entry deleted')
            setDeleteJournalId(null)
            setSelectedIds(ids => { const next = new Set(ids); next.delete(deleteJournalId!); return next })
        },
        onError: () => toast.error('Failed to delete entry'),
    })

    const batchVerify = useMutation({
        mutationFn: ({ entryIds, verified }: { entryIds: string[]; verified: boolean }) =>
            apiFetch(`/internship/${id}/journal/verify`, {
                method: 'POST',
                body: JSON.stringify({ entryIds, verified }),
            }),
        onSuccess: (_data: unknown, vars: { entryIds: string[]; verified: boolean }) => {
            qc.invalidateQueries({ queryKey: ['internship', id] })
            toast.success(`${vars.entryIds.length} ${vars.verified ? 'verified' : 'unverified'}`)
            setSelectedIds(new Set())
        },
        onError: () => toast.error('Failed to update entries'),
    })

    // ── Selection helpers ─────────────────────────────────────────────────────

    const entries = data?.journalEntries ?? []

    function toggleSelect(entryId: string) {
        setSelectedIds(ids => {
            const next = new Set(ids)
            next.has(entryId) ? next.delete(entryId) : next.add(entryId)
            return next
        })
    }

    function toggleSelectAll() {
        setSelectedIds(ids => ids.size === entries.length ? new Set() : new Set(entries.map(e => e.id)))
    }

    // ── Loading / error states ────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Could not load internship.
            </div>
        )
    }

    const { internship, locations, journalEntries } = data
    const pct = Math.min(100, (internship.completedHours / requiredHours) * 100)

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="h-full overflow-y-auto print:overflow-visible">

            {/* ── Header ── */}
            <div className="bg-primary text-primary-foreground px-6 py-4 print:hidden">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => navigate('/internship')} className="shrink-0 hover:opacity-70 transition-opacity">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                            <div className="font-semibold truncate">{internship.studentName}</div>
                            <div className="text-xs opacity-75">{internship.studentEmail}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => window.print()} className="hover:opacity-70 transition-opacity">
                            <Printer className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Print-only header ── */}
            <div className="hidden print:block px-8 pt-6 pb-2 border-b">
                <h1 className="text-xl font-bold">{internship.studentName} — Internship Journal</h1>
                <p className="text-sm text-gray-600">{internship.studentEmail}{internship.sectionId ? ` · Section ${internship.sectionId}` : ''}</p>
            </div>

            <div className="p-6 space-y-6 max-w-5xl">

                {/* ── Status + Hours ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status</span>
                            <StatusBadge status={internship.status} />
                        </div>
                        <Select
                            value={internship.status}
                            onValueChange={v => updateStatus.mutate(v as InternshipStatus)}
                        >
                            <SelectTrigger className="h-8 text-xs print:hidden">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {(internship.startDate || internship.endDate) && (
                            <p className="text-xs text-muted-foreground">
                                {internship.startDate ?? '?'} → {internship.endDate ?? 'ongoing'}
                            </p>
                        )}
                    </div>

                    <div className="rounded-lg border p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Hours Logged</span>
                            <span className="font-mono text-sm">
                                {internship.completedHours.toFixed(1)} / {requiredHours}
                            </span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                            {pct.toFixed(0)}% complete · {(requiredHours - internship.completedHours).toFixed(1)} hrs remaining
                        </p>
                    </div>
                </div>

                {/* ── Locations ── */}
                <section>
                    <div className="flex items-center justify-between mb-3 print:hidden">
                        <h2 className="text-sm font-semibold flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" /> Employer Locations
                        </h2>
                        <Button size="sm" variant="outline" onClick={() => setShowLocationDialog(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Location
                        </Button>
                    </div>

                    {locations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No locations added yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {locations.map(loc => (
                                <div key={loc.id} className="rounded-lg border p-4 space-y-1 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{loc.employerName}</span>
                                        <button
                                            className="print:hidden text-xs flex items-center gap-1 hover:opacity-70 transition-opacity"
                                            onClick={() => toggleValidated.mutate({ locationId: loc.id, validated: !loc.validated })}
                                        >
                                            {loc.validated ? (
                                                <><ShieldCheck className="h-3.5 w-3.5 text-green-600" /><span className="text-green-700">Validated</span></>
                                            ) : (
                                                <><ShieldOff className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Unvalidated</span></>
                                            )}
                                        </button>
                                        {/* Print-only validated indicator */}
                                        <span className="hidden print:inline text-xs">
                                            {loc.validated ? '✓ Validated' : 'Unvalidated'}
                                        </span>
                                    </div>
                                    {(loc.address || loc.city) && (
                                        <p className="text-xs text-muted-foreground">
                                            {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                    {loc.supervisorName && (
                                        <p className="text-xs text-muted-foreground">
                                            Supervisor: {loc.supervisorName}
                                            {loc.supervisorEmail ? ` · ${loc.supervisorEmail}` : ''}
                                            {loc.supervisorPhone ? ` · ${loc.supervisorPhone}` : ''}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── Journal Entries ── */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold">Journal Entries</h2>
                        <div className="flex items-center gap-2 print:hidden">
                            {selectedIds.size > 0 && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => batchVerify.mutate({ entryIds: [...selectedIds], verified: true })}
                                        disabled={batchVerify.isPending}
                                    >
                                        <CheckSquare className="h-3.5 w-3.5 mr-1" />
                                        Verify ({selectedIds.size})
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => batchVerify.mutate({ entryIds: [...selectedIds], verified: false })}
                                        disabled={batchVerify.isPending}
                                    >
                                        Unverify ({selectedIds.size})
                                    </Button>
                                </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setShowJournalDialog(true)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Entry
                            </Button>
                        </div>
                    </div>

                    {journalEntries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No journal entries yet.</p>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2.5 print:hidden">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === entries.length && entries.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded"
                                            />
                                        </th>
                                        <th className="text-left px-3 py-2.5 font-medium">Date</th>
                                        <th className="text-left px-3 py-2.5 font-medium">Title</th>
                                        <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Location</th>
                                        <th className="text-left px-3 py-2.5 font-medium">Time</th>
                                        <th className="text-right px-3 py-2.5 font-medium">Hours</th>
                                        <th className="text-center px-3 py-2.5 font-medium">Verified</th>
                                        <th className="px-3 py-2.5 print:hidden" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {journalEntries.map(entry => {
                                        const loc = locations.find(l => l.id === entry.locationId)
                                        return (
                                            <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-3 py-2.5 print:hidden">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(entry.id)}
                                                        onChange={() => toggleSelect(entry.id)}
                                                        className="rounded"
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap">{entry.date}</td>
                                                <td className="px-3 py-2.5">
                                                    <div className="font-medium">{entry.title}</div>
                                                    <div className="text-xs text-muted-foreground line-clamp-1">{entry.description}</div>
                                                </td>
                                                <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                                                    {loc?.employerName ?? '—'}
                                                </td>
                                                <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                                                    {entry.timeStart} – {entry.timeEnd}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono text-xs">
                                                    {formatMinutes(entry.totalMinutes)}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    {entry.verified ? (
                                                        <span className="text-green-600 text-xs font-medium">✓</span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-right print:hidden">
                                                    <button
                                                        onClick={() => setDeleteJournalId(entry.id)}
                                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot className="bg-muted/50">
                                    <tr>
                                        <td colSpan={5} className="px-3 py-2 text-xs text-muted-foreground font-medium text-right">
                                            Total
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-xs font-bold">
                                            {internship.completedHours.toFixed(1)}h
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* ── Add Location Dialog ── */}
            <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Location</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={e => { e.preventDefault(); createLocation.mutate(locationForm) }}
                        className="space-y-3"
                    >
                        <div className="space-y-1.5">
                            <Label>Employer Name *</Label>
                            <Input
                                required
                                value={locationForm.employerName}
                                onChange={e => setLocationForm(f => ({ ...f, employerName: e.target.value }))}
                                placeholder="Acme Corporation"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Address</Label>
                            <Input
                                value={locationForm.address}
                                onChange={e => setLocationForm(f => ({ ...f, address: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>City</Label>
                                <Input value={locationForm.city} onChange={e => setLocationForm(f => ({ ...f, city: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>State</Label>
                                <Input value={locationForm.state} onChange={e => setLocationForm(f => ({ ...f, state: e.target.value }))} placeholder="OH" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Zip</Label>
                            <Input value={locationForm.zip} onChange={e => setLocationForm(f => ({ ...f, zip: e.target.value }))} placeholder="45365" />
                        </div>
                        <div className="border-t pt-3 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supervisor</p>
                            <Input placeholder="Name" value={locationForm.supervisorName} onChange={e => setLocationForm(f => ({ ...f, supervisorName: e.target.value }))} />
                            <Input placeholder="Email" type="email" value={locationForm.supervisorEmail} onChange={e => setLocationForm(f => ({ ...f, supervisorEmail: e.target.value }))} />
                            <Input placeholder="Phone" value={locationForm.supervisorPhone} onChange={e => setLocationForm(f => ({ ...f, supervisorPhone: e.target.value }))} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowLocationDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={createLocation.isPending}>
                                {createLocation.isPending ? 'Adding…' : 'Add Location'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Add Journal Entry Dialog ── */}
            <Dialog open={showJournalDialog} onOpenChange={setShowJournalDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Journal Entry</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={e => {
                            e.preventDefault()
                            const mins = minutesBetween(journalForm.timeStart, journalForm.timeEnd)
                            if (mins <= 0) { toast.error('End time must be after start time'); return }
                            createJournal.mutate(journalForm)
                        }}
                        className="space-y-3"
                    >
                        <div className="space-y-1.5">
                            <Label>Date *</Label>
                            <Input
                                required
                                type="date"
                                value={journalForm.date}
                                onChange={e => setJournalForm(f => ({ ...f, date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Title *</Label>
                            <Input
                                required
                                value={journalForm.title}
                                onChange={e => setJournalForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Observed client meeting"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description *</Label>
                            <Textarea
                                required
                                value={journalForm.description}
                                onChange={e => setJournalForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="What did you do and learn?"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Time Start</Label>
                                <Select value={journalForm.timeStart} onValueChange={v => setJournalForm(f => ({ ...f, timeStart: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-48 overflow-y-auto">
                                        {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Time End</Label>
                                <Select value={journalForm.timeEnd} onValueChange={v => setJournalForm(f => ({ ...f, timeEnd: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-48 overflow-y-auto">
                                        {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {journalForm.timeStart && journalForm.timeEnd && minutesBetween(journalForm.timeStart, journalForm.timeEnd) > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Duration: {formatMinutes(minutesBetween(journalForm.timeStart, journalForm.timeEnd))}
                            </p>
                        )}
                        {locations.length > 0 && (
                            <div className="space-y-1.5">
                                <Label>Location (optional)</Label>
                                <Select
                                    value={journalForm.locationId || '__none__'}
                                    onValueChange={v => setJournalForm(f => ({ ...f, locationId: v === '__none__' ? '' : v }))}
                                >
                                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {locations.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>{loc.employerName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowJournalDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={createJournal.isPending}>
                                {createJournal.isPending ? 'Adding…' : 'Add Entry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={!!deleteJournalId} onOpenChange={open => !open && setDeleteJournalId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Entry?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will permanently delete the journal entry and recalculate total hours.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteJournalId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            disabled={deleteJournal.isPending}
                            onClick={() => deleteJournalId && deleteJournal.mutate(deleteJournalId)}
                        >
                            {deleteJournal.isPending ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
