import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, ChevronRight, BookOpen, Lock, ChevronDown, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MasterSyllabus } from '@syllabee/types'

interface Term { id: string; name: string; code: string; isActive?: boolean }

type Mode = 'list' | 'add'

const EMPTY_FORM = {
    termCode: '',
    interactiveView: false,
}

export default function EditorPage() {
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [mode, setMode] = React.useState<Mode>('list')
    const [search, setSearch] = React.useState('')
    const [form, setForm] = React.useState(EMPTY_FORM)

    // Combobox state
    const [termSearch, setTermSearch] = React.useState('')
    const [termMenuOpen, setTermMenuOpen] = React.useState(false)
    const termInputRef = React.useRef<HTMLInputElement>(null)
    const termMenuRef = React.useRef<HTMLDivElement>(null)

    const { data: syllabi = [], isLoading } = useQuery({
        queryKey: ['syllabi'],
        queryFn: () => apiFetch<{ data: MasterSyllabus[] }>('/editor/syllabi').then(r => r.data ?? []),
    })

    const { data: terms = [] } = useQuery<Term[]>({
        queryKey: ['terms'],
        queryFn: () => apiFetch<{ data: Term[] }>('/registration/terms').then(r => r.data ?? []),
    })

    // Descending by term code
    const sortedTerms = React.useMemo(
        () => [...terms].filter(t => t.isActive !== false).sort((a, b) => b.code.localeCompare(a.code)),
        [terms]
    )

    const filteredTerms = React.useMemo(() => {
        const q = termSearch.toLowerCase()
        if (!q) return sortedTerms
        return sortedTerms.filter(t =>
            t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
        )
    }, [sortedTerms, termSearch])

    const selectedTerm = terms.find(t => t.code === form.termCode) ?? null

    // Close menu on outside click
    React.useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                termInputRef.current && !termInputRef.current.contains(e.target as Node) &&
                termMenuRef.current && !termMenuRef.current.contains(e.target as Node)
            ) {
                setTermMenuOpen(false)
                // If no term is selected, clear the search text
                if (!form.termCode) setTermSearch('')
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [form.termCode])

    const createMutation = useMutation({
        mutationFn: (body: { termCode: string; interactiveView: boolean; title: string }) =>
            apiFetch<{ data: { id: string } }>('/editor/syllabi', {
                method: 'POST',
                body: JSON.stringify(body),
            }),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['syllabi'] })
            toast.success('Syllabus created')
            setMode('list')
            setForm(EMPTY_FORM)
            setTermSearch('')
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
        if (!form.termCode || !selectedTerm) {
            toast.error('Term is required')
            return
        }
        createMutation.mutate({
            termCode: form.termCode,
            interactiveView: form.interactiveView,
            title: selectedTerm.name,
        })
    }

    function resetForm() {
        setMode('list')
        setForm(EMPTY_FORM)
        setTermSearch('')
        setTermMenuOpen(false)
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
                        <Button size="sm" variant="secondary" onClick={resetForm}>
                            Cancel
                        </Button>
                    )}
                </div>
            </div>

            {mode === 'add' ? (
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-lg">

                    {/* ── Term combobox ── */}
                    <div className="space-y-1.5">
                        <Label htmlFor="term-input">Term</Label>
                        <div className="relative">
                            <div className="relative flex items-center border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring">
                                <input
                                    id="term-input"
                                    ref={termInputRef}
                                    value={termSearch}
                                    placeholder="Search terms…"
                                    autoComplete="off"
                                    className="flex-1 h-9 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                                    onChange={e => {
                                        setTermSearch(e.target.value)
                                        setForm(f => ({ ...f, termCode: '' }))
                                        setTermMenuOpen(true)
                                    }}
                                    onFocus={() => setTermMenuOpen(true)}
                                />
                                {termSearch ? (
                                    <button
                                        type="button"
                                        className="px-2 text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            setTermSearch('')
                                            setForm(f => ({ ...f, termCode: '' }))
                                            termInputRef.current?.focus()
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="px-2 text-muted-foreground hover:text-foreground"
                                        onMouseDown={e => {
                                            e.preventDefault()
                                            setTermMenuOpen(o => !o)
                                            termInputRef.current?.focus()
                                        }}
                                    >
                                        <ChevronDown className="h-4 w-4 shrink-0" />
                                    </button>
                                )}
                            </div>

                            {termMenuOpen && (
                                <div
                                    ref={termMenuRef}
                                    className="absolute z-50 top-full left-0 right-0 border border-input bg-popover shadow-md max-h-52 overflow-y-auto"
                                >
                                    {filteredTerms.length === 0 ? (
                                        <p className="px-3 py-2 text-sm text-muted-foreground">No terms found.</p>
                                    ) : filteredTerms.map(term => (
                                        <button
                                            key={term.id}
                                            type="button"
                                            className={cn(
                                                'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                                                form.termCode === term.code && 'bg-accent text-accent-foreground font-medium'
                                            )}
                                            onMouseDown={e => {
                                                e.preventDefault()
                                                setForm(f => ({ ...f, termCode: term.code }))
                                                setTermSearch(term.name)
                                                setTermMenuOpen(false)
                                            }}
                                        >
                                            <span>{term.name}</span>
                                            <span className="ml-2 text-xs text-muted-foreground">{term.code}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Syllabus type choice cards ── */}
                    <div className="space-y-1.5">
                        <Label>Student View</Label>
                        <div className="flex flex-col gap-2">
                            {([
                                {
                                    value: false,
                                    label: 'Interactive Syllabus',
                                    description: 'Students step through content sequentially, answer embedded quiz questions, and earn points. Supports LTI grade passback to the LMS.',
                                },
                                {
                                    value: true,
                                    label: 'Traditional Syllabus',
                                    description: 'A static, navigable document. Students can read through sections at their own pace with no grading or time constraints.',
                                },
                            ] as const).map(({ value, label, description }) => {
                                const selected = form.interactiveView === value
                                return (
                                    <label
                                        key={String(value)}
                                        className={cn(
                                            'flex items-start gap-3 border p-3 cursor-pointer transition-colors',
                                            selected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50 hover:bg-muted/40'
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="syllabusType"
                                            checked={selected}
                                            onChange={() => setForm(f => ({ ...f, interactiveView: value }))}
                                            className="sr-only"
                                        />
                                        <div className={cn(
                                            'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
                                            selected ? 'border-primary' : 'border-muted-foreground/40'
                                        )}>
                                            {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium leading-none mb-1">{label}</p>
                                            <p className="text-xs text-muted-foreground leading-snug">{description}</p>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    <Button type="submit" disabled={createMutation.isPending} className="w-full rounded-none">
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
