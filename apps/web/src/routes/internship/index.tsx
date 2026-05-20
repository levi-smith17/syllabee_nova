import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, ChevronRight, BriefcaseBusiness } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import type { Internship, InternshipStatus, InternshipSettings } from '@syllabee/types'

const STATUS_COLORS: Record<InternshipStatus, string> = {
    PENDING:   'bg-yellow-100 text-yellow-800',
    ACTIVE:    'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    WITHDRAWN: 'bg-gray-100 text-gray-700',
}

function StatusBadge({ status }: { status: InternshipStatus }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
            {status}
        </span>
    )
}

const EMPTY_FORM = {
    studentId: '',
    studentName: '',
    studentEmail: '',
    sectionId: '',
    startDate: '',
    endDate: '',
}

type Mode = 'list' | 'add'

export default function InternshipPage() {
    const navigate = useNavigate()
    const qc = useQueryClient()

    const [mode, setMode] = React.useState<Mode>('list')
    const [search, setSearch] = React.useState('')
    const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
    const [form, setForm] = React.useState(EMPTY_FORM)

    const { data: internships = [], isLoading } = useQuery({
        queryKey: ['internships'],
        queryFn: () => apiFetch<{ data: Internship[] }>('/internship').then(r => r.data ?? []),
    })

    const { data: settings } = useQuery({
        queryKey: ['internship-settings'],
        queryFn: () => apiFetch<{ data: InternshipSettings }>('/internship/settings').then(r => r.data),
    })

    const requiredHours = settings?.requiredHours ?? 224

    const createMutation = useMutation({
        mutationFn: (body: typeof EMPTY_FORM) =>
            apiFetch<{ data: { id: string } }>('/internship', {
                method: 'POST',
                body: JSON.stringify(body),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['internships'] })
            toast.success('Internship created')
            setMode('list')
            setForm(EMPTY_FORM)
        },
        onError: () => toast.error('Failed to create internship'),
    })

    const filtered = React.useMemo(() => {
        const q = search.toLowerCase()
        return internships.filter(i => {
            const matchesSearch =
                !q ||
                i.studentName.toLowerCase().includes(q) ||
                i.studentEmail.toLowerCase().includes(q) ||
                (i.sectionId ?? '').toLowerCase().includes(q)
            const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [internships, search, statusFilter])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.studentId || !form.studentName || !form.studentEmail) {
            toast.error('Student ID, name, and email are required')
            return
        }
        createMutation.mutate(form)
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-5 w-5" />
                    <h1 className="text-lg font-semibold">
                        {mode === 'add' ? 'New Internship' : 'Internships'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {mode === 'list' ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setMode('add')}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => { setMode('list'); setForm(EMPTY_FORM) }}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </div>

            {mode === 'add' ? (
                /* ── Add form ── */
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                        <Label htmlFor="studentId">Student ID *</Label>
                        <Input
                            id="studentId"
                            value={form.studentId}
                            onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                            placeholder="e.g. s12345"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="studentName">Student Name *</Label>
                        <Input
                            id="studentName"
                            value={form.studentName}
                            onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="studentEmail">Student Email *</Label>
                        <Input
                            id="studentEmail"
                            type="email"
                            value={form.studentEmail}
                            onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))}
                            placeholder="jane@edisonohio.edu"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="sectionId">Section ID</Label>
                        <Input
                            id="sectionId"
                            value={form.sectionId}
                            onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))}
                            placeholder="Optional"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={form.startDate}
                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={form.endDate}
                                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={createMutation.isPending} className="w-full">
                        {createMutation.isPending ? 'Creating…' : 'Create Internship'}
                    </Button>
                </form>
            ) : (
                /* ── List view ── */
                <div className="p-6 space-y-4">
                    {/* Filters */}
                    <div className="flex gap-3 items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                placeholder="Search by name, email, or section…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            {internships.length === 0 ? 'No internships yet. Add one to get started.' : 'No results match your filters.'}
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm print:text-xs">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 font-medium">Student</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Section</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Hours</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Dates</th>
                                        <th className="px-4 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.map(internship => {
                                        const pct = Math.min(100, (internship.completedHours / requiredHours) * 100)
                                        return (
                                            <tr
                                                key={internship.id}
                                                className="hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => navigate(`/internship/${internship.id}`)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{internship.studentName}</div>
                                                    <div className="text-xs text-muted-foreground">{internship.studentEmail}</div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {internship.sectionId ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={internship.status} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs mb-1">
                                                        {internship.completedHours.toFixed(1)} / {requiredHours} hrs
                                                    </div>
                                                    <Progress value={pct} className="h-1.5 w-24" />
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {internship.startDate
                                                        ? `${internship.startDate}${internship.endDate ? ` → ${internship.endDate}` : ''}`
                                                        : '—'
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
