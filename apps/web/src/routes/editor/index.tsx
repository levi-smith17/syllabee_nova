import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, ChevronRight, BookOpen, Lock } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { MasterSyllabus } from '@syllabee/types'

type Mode = 'list' | 'add'

const EMPTY_FORM = {
    title: '',
    termCode: '',
    interactiveView: false,
}

export default function EditorPage() {
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [mode, setMode] = React.useState<Mode>('list')
    const [search, setSearch] = React.useState('')
    const [form, setForm] = React.useState(EMPTY_FORM)

    const { data: syllabi = [], isLoading } = useQuery({
        queryKey: ['syllabi'],
        queryFn: () => apiFetch<{ data: MasterSyllabus[] }>('/editor/syllabi').then(r => r.data ?? []),
    })

    const createMutation = useMutation({
        mutationFn: (body: typeof EMPTY_FORM) =>
            apiFetch<{ data: { id: string } }>('/editor/syllabi', {
                method: 'POST',
                body: JSON.stringify(body),
            }),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['syllabi'] })
            toast.success('Syllabus created')
            setMode('list')
            setForm(EMPTY_FORM)
            navigate(`/editor/${res.data.id}`)
        },
        onError: () => toast.error('Failed to create syllabus'),
    })

    const filtered = React.useMemo(() => {
        const q = search.toLowerCase()
        if (!q) return syllabi
        return syllabi.filter(s =>
            s.title.toLowerCase().includes(q) ||
            (s.termCode ?? '').toLowerCase().includes(q)
        )
    }, [syllabi, search])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.title.trim()) {
            toast.error('Title is required')
            return
        }
        createMutation.mutate(form)
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <h1 className="text-lg font-semibold">
                        {mode === 'add' ? 'New Syllabus' : 'Syllabi'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {mode === 'list' ? (
                        <Button size="sm" variant="secondary" onClick={() => setMode('add')}>
                            <Plus className="h-4 w-4 mr-1" />
                            New Syllabus
                        </Button>
                    ) : (
                        <Button size="sm" variant="secondary" onClick={() => { setMode('list'); setForm(EMPTY_FORM) }}>
                            Cancel
                        </Button>
                    )}
                </div>
            </div>

            {mode === 'add' ? (
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="e.g. CIS-101 Master Syllabus"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="termCode">Term Code</Label>
                        <Input
                            id="termCode"
                            value={form.termCode}
                            onChange={e => setForm(f => ({ ...f, termCode: e.target.value }))}
                            placeholder="e.g. FA24"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch
                            id="interactiveView"
                            checked={form.interactiveView}
                            onCheckedChange={v => setForm(f => ({ ...f, interactiveView: v }))}
                        />
                        <Label htmlFor="interactiveView">Interactive View</Label>
                    </div>
                    <Button type="submit" disabled={createMutation.isPending} className="w-full">
                        {createMutation.isPending ? 'Creating…' : 'Create Syllabus'}
                    </Button>
                </form>
            ) : (
                <div className="p-6 space-y-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-8"
                            placeholder="Search by title or term…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {isLoading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            {syllabi.length === 0
                                ? 'No syllabi yet. Create one to get started.'
                                : 'No results match your search.'}
                        </p>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 font-medium">Title</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Term</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Status</th>
                                        <th className="text-left px-4 py-2.5 font-medium">Created</th>
                                        <th className="px-4 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filtered.map(syllabus => (
                                        <tr
                                            key={syllabus.id}
                                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/editor/${syllabus.id}`)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{syllabus.title}</div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {syllabus.termCode ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {syllabus.locked && (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <Lock className="h-3 w-3" />
                                                            Locked
                                                        </Badge>
                                                    )}
                                                    {syllabus.interactiveView && (
                                                        <Badge variant="default">Interactive</Badge>
                                                    )}
                                                    {!syllabus.locked && !syllabus.interactiveView && (
                                                        <Badge variant="outline">Draft</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {syllabus.createdAt
                                                    ? new Date(syllabus.createdAt).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground inline" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
