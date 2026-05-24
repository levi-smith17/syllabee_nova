import React from 'react'
import {
    Lock, Unlock, Trash2, Pencil, Search, X, ChevronDown, ChevronLeft, ChevronRight,
    Loader2, MoreHorizontal, BookOpen, BarChart3, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextEditor } from '../../components/editor/text-editor'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ColHeader, DeleteButton, Col1Mode } from './shared'
import { GradingScaleColumn } from './grading-scales'
import type { MasterSyllabus, GradingScale, GradingScaleGrade } from '@syllabee/types'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SYL_PAGE_SIZE = 7
const GS_PAGE_SIZE = 2

// ── Small pagination bar ──────────────────────────────────────────────────────

function PaginationBar({ page, totalPages, onPrev, onNext }: {
    page: number; totalPages: number; onPrev: () => void; onNext: () => void
}) {
    return (
        <div className="flex items-center justify-between p-2 border-b">
            <button onClick={onPrev} disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-sm text-xs p-2 disabled:opacity-40 disabled:pointer-events-none hover:bg-muted/60 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />Prev
            </button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <button onClick={onNext} disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-sm text-xs p-2 disabled:opacity-40 disabled:pointer-events-none hover:bg-muted/60 transition-colors">
                Next<ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

// ── Grading Scale inline card (cyan) ─────────────────────────────────────────

function GradingScaleCard({ scale, onEdit, onDelete }: {
    scale: GradingScale
    onEdit: () => void
    onDelete: () => void
}) {
    const grades = [...(scale.grades ?? [])].sort((a, b) => b.maxPercent - a.maxPercent)
    const gradeList = grades.length > 0 ? (
        <div className="columns-2 gap-x-4 gap-y-0.5 text-muted-foreground mt-0.5 leading-relaxed">
            {grades.map((g, idx) => (
                <div key={idx} className="text-xs break-inside-avoid">
                    {g.letter}: {g.minPercent}–{g.maxPercent}%
                </div>
            ))}
        </div>
    ) : null;

    return (
        <div className="flex items-stretch border border-sidebar-foreground">
            <div className="flex flex-col items-center bg-sidebar-foreground gap-1 py-2 px-1.5 shrink-0">
                <BarChart3 className="h-4 w-4 text-primary-foreground my-1 shrink-0" />
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost"
                                        className="h-7 w-7 p-2 rounded-sm bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="ml-1">
                            Manage Grading Scale
                        </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="start" side="right" onCloseAutoFocus={(e) => e.preventDefault()}>
                        <DropdownMenuItem onClick={onEdit} className="focus:bg-muted-hover">
                            <Pencil className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-popover-border" />
                        <DropdownMenuItem
                            className="bg-destructive text-destructive-foreground focus:bg-destructive/70 transition-colors"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="flex-1 min-w-0 px-3 py-2.5">
                <p className="text-xs font-medium">{scale.name}</p>
                {gradeList}
            </div>
        </div>
    )
}

// ── Syllabi list ──────────────────────────────────────────────────────────────

function SyllabusList({
    syllabi, isLoading, selectedId, onSelect, onEdit, onLock, onDelete,
    gradingScales, gradingScalesLoading, onEditGradingScale, onDeleteGradingScale,
}: {
    syllabi: MasterSyllabus[]
    isLoading: boolean
    selectedId?: string
    onSelect: (id: string) => void
    onEdit: (id: string) => void
    onLock: (id: string) => void
    onDelete: (id: string) => void
    gradingScales: GradingScale[]
    gradingScalesLoading: boolean
    onEditGradingScale: (scale: GradingScale) => void
    onDeleteGradingScale: (id: string) => void
}) {
    const [search, setSearch] = React.useState('')
    const [sylPage, setSylPage] = React.useState(1)
    const [gsPage, setGsPage] = React.useState(1)
    const [sylDeleteId, setSylDeleteId] = React.useState<string | null>(null)
    const [gsDeleteId, setGsDeleteId] = React.useState<string | null>(null)

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        const arr = !q ? syllabi : syllabi.filter(s =>
            s.title.toLowerCase().includes(q) || (s.termCode ?? '').toLowerCase().includes(q)
        )
        return [...arr].sort((a, b) => (b.termCode ?? '').localeCompare(a.termCode ?? ''))
    }, [syllabi, search])

    const sylTotalPages = Math.max(1, Math.ceil(filtered.length / SYL_PAGE_SIZE))
    const pagedSyllabi = filtered.slice((sylPage - 1) * SYL_PAGE_SIZE, sylPage * SYL_PAGE_SIZE)

    const gsTotalPages = Math.max(1, Math.ceil(gradingScales.length / GS_PAGE_SIZE))
    const pagedGS = gradingScales.slice((gsPage - 1) * GS_PAGE_SIZE, gsPage * GS_PAGE_SIZE)

    const gsDeleteTarget = gradingScales.find(s => s.id === gsDeleteId)
    const sylDeleteTarget = syllabi.find(s => s.id === sylDeleteId)

    // Reset pages when lists change
    React.useEffect(() => { setSylPage(1) }, [filtered.length])
    React.useEffect(() => { setGsPage(1) }, [gradingScales.length])

    return (
        <>
            {/* Search */}
            <div className="shrink-0 px-3 py-2 border-b focus-within:bg-input-focus">
                <div className="flex items-center h-7 border border-transparent bg-transparent transition-colors">
                    <Search className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setSylPage(1) }}
                        placeholder="Search syllabi…"
                        className="flex-1 min-w-0 bg-transparent text-xs px-2 outline-none placeholder:text-muted-foreground"
                    />
                    {search && (
                        <button onClick={() => { setSearch(''); setSylPage(1) }} className="mr-1 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4 shrink-0 hover:text-destructive" />
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-y-auto border-b">

                {/* Grading Scales section */}
                {(gradingScalesLoading || gradingScales.length > 0) && (
                    <>
                        {gradingScalesLoading ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading grading scales…
                            </div>
                        ) : (
                            <>
                                {gsTotalPages > 1 && (
                                    <PaginationBar
                                        page={gsPage} totalPages={gsTotalPages}
                                        onPrev={() => setGsPage(p => Math.max(1, p - 1))}
                                        onNext={() => setGsPage(p => Math.min(gsTotalPages, p + 1))}
                                    />
                                )}
                                <div className="p-3 space-y-3">
                                    {pagedGS.map(scale => (
                                        <GradingScaleCard
                                            key={scale.id}
                                            scale={scale}
                                            onEdit={() => onEditGradingScale(scale)}
                                            onDelete={() => setGsDeleteId(scale.id)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}

            </div>
            <div className="flex-1 overflow-y-auto">

                {/* Syllabi section */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading syllabi…
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                        {syllabi.length === 0 ? 'No syllabi yet — add one.' : 'No results.'}
                    </p>
                ) : (
                    <>
                        {sylTotalPages > 7 && (
                            <PaginationBar
                                page={sylPage} totalPages={sylTotalPages}
                                onPrev={() => setSylPage(p => Math.max(1, p - 1))}
                                onNext={() => setSylPage(p => Math.min(sylTotalPages, p + 1))}
                            />
                        )}
                        <div className="p-3 space-y-3">
                            {pagedSyllabi.map(s => (
                                <div
                                    key={s.id}
                                    className={cn(
                                        'flex items-stretch border transition-colors',
                                        s.id === selectedId ? 'border-primary bg-muted-selected' : 'border-border',
                                    )}
                                >
                                    <div className="flex flex-col items-center bg-primary gap-1 py-2 px-1.5 shrink-0">
                                        <BookOpen className="h-4 w-4 text-primary-foreground shrink-0 my-1.5" />
                                        <DropdownMenu>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button type="button" variant="ghost" className="h-7 w-7 p-2 rounded-sm bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="ml-1">
                                                    Manage Syllabus
                                                </TooltipContent>
                                            </Tooltip>
                                            <DropdownMenuContent align="start" side="right" onCloseAutoFocus={(e) => e.preventDefault()}>
                                                <DropdownMenuItem
                                                    className="focus:bg-muted-hover"
                                                    onClick={() => onEdit(s.id)}>
                                                    <Pencil className="h-4 w-4 mr-2" />Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-popover-border" />
                                                <DropdownMenuItem
                                                    className="bg-destructive text-destructive-foreground focus:bg-destructive/70 transition-colors"
                                                    onClick={() => setSylDeleteId(s.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button type="button" variant="ghost"
                                                    className="h-7 w-7 p-2 rounded-sm bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors"
                                                    onClick={() => onLock(s.id)}
                                                >
                                                    {s.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="ml-1">
                                                {s.locked ? 'Unlock syllabus' : 'Lock syllabus'}
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>

                                    <div
                                        className="flex items-start gap-1.5 flex-1 min-w-0 px-3 py-2.5 cursor-pointer hover:bg-muted-hover transition-colors"
                                        onClick={() => onSelect(s.id)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-xs font-medium truncate">{s.title}</span>
                                                {s.locked && <Lock className="h-3 w-3 text-amber-500 shrink-0" />}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {s.termCode ?? '—'}
                                                {s.interactiveView && (
                                                    <span className="ml-1.5 text-primary font-medium">Interactive</span>
                                                )}
                                            </p>
                                            {s.officeHours && (
                                                <div className="mt-1.5 text-[11px] text-muted-foreground">
                                                    <span className="font-bold">Office Hours:</span>
                                                    <div
                                                        className="[&>p]:my-0 [&>ul]:my-0.5 [&>ol]:my-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                                        dangerouslySetInnerHTML={{ __html: s.officeHours }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* GS delete confirmation */}
            <Dialog open={!!gsDeleteId} onOpenChange={v => !v && setGsDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Grading Scale</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{gsDeleteTarget?.name}</strong>. Any blocks using this scale will lose their grade reference. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGsDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => { onDeleteGradingScale(gsDeleteId!); setGsDeleteId(null) }}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Syllabus delete confirmation (from list action) */}
            <Dialog open={!!sylDeleteId} onOpenChange={v => !v && setSylDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Syllabus</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{sylDeleteTarget?.title}</strong> and all its segments and blocks. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSylDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => { onDelete(sylDeleteId!); setSylDeleteId(null) }}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

function SyllabusForm({
    mode,
    syllabus,
    locked,
    terms,
    syllabi,
    onSave,
    isSaving,
}: {
    mode: 'add' | 'edit'
    syllabus?: MasterSyllabus
    locked?: boolean
    terms?: { id: string; name: string; code: string; isActive?: boolean }[]
    syllabi?: MasterSyllabus[]
    onSave: (body: Record<string, unknown>) => void
    isSaving: boolean
}) {
    const [form, setForm] = React.useState({
        termCode: syllabus?.termCode ?? '',
        officeHours: syllabus?.officeHours ?? '',
        interactiveView: syllabus?.interactiveView ?? true,
        timeout: syllabus?.timeout ?? 2000,
        prohibitBacktracking: syllabus?.prohibitBacktracking ?? false,
        maxAttempts: syllabus?.maxAttempts ?? 3,
        maxPoints: syllabus?.maxPoints ?? 3,
        randomizeResponses: syllabus?.randomizeResponses ?? false,
        pointsLadder: syllabus?.pointsLadder ?? false,
        pointsLadderDeduction: syllabus?.pointsLadderDeduction ?? 1,
    })

    React.useEffect(() => {
        if (!syllabus) return

        setForm({
            termCode: syllabus.termCode ?? '',
            officeHours: syllabus.officeHours ?? '',
            interactiveView: syllabus.interactiveView,
            timeout: syllabus.timeout,
            prohibitBacktracking: syllabus.prohibitBacktracking,
            maxAttempts: syllabus.maxAttempts ?? 3,
            maxPoints: syllabus.maxPoints ?? 3,
            randomizeResponses: syllabus.randomizeResponses,
            pointsLadder: syllabus.pointsLadder,
            pointsLadderDeduction: syllabus.pointsLadderDeduction ?? 1,
        })
    }, [syllabus?.id])

    function f<K extends keyof typeof form>(key: K) {
        return (val: (typeof form)[K]) =>
            setForm(prev => ({ ...prev, [key]: val }))
    }

    // ── Add mode term picker ──────────────────────────────────────────────

    const [termSearch, setTermSearch] = React.useState('')
    const [termOpen, setTermOpen] = React.useState(false)

    const termInputRef = React.useRef<HTMLInputElement>(null)
    const termMenuRef = React.useRef<HTMLDivElement>(null)

    const usedTermCodes = React.useMemo(
        () => new Set((syllabi ?? []).map(s => s.termCode).filter(Boolean)),
        [syllabi],
    )

    const sortedTerms = React.useMemo(
        () =>
            [...(terms ?? [])]
                .filter(t => t.isActive !== false && !usedTermCodes.has(t.code))
                .sort((a, b) => b.code.localeCompare(a.code)),
        [terms, usedTermCodes],
    )

    const filteredTerms = React.useMemo(() => {
        const q = termSearch.toLowerCase()

        return q
            ? sortedTerms.filter(
                t =>
                    t.name.toLowerCase().includes(q) ||
                    t.code.toLowerCase().includes(q),
            )
            : sortedTerms
    }, [sortedTerms, termSearch])

    const selectedTerm =
        sortedTerms.find(t => t.code === form.termCode) ?? null

    React.useEffect(() => {
        if (!termOpen) return

        function handle(e: MouseEvent) {
            if (
                termInputRef.current &&
                !termInputRef.current.contains(e.target as Node) &&
                termMenuRef.current &&
                !termMenuRef.current.contains(e.target as Node)
            ) {
                setTermOpen(false)

                if (!form.termCode) {
                    setTermSearch('')
                }
            }
        }

        document.addEventListener('mousedown', handle)

        return () => document.removeEventListener('mousedown', handle)
    }, [termOpen, form.termCode])

    // ── Submit ────────────────────────────────────────────────────────────

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (mode === 'add') {
            if (!form.termCode || !selectedTerm) {
                toast.error('Term is required')
                return
            }
        }

        const payload: Record<string, unknown> = {
            officeHours: form.officeHours || undefined,
            interactiveView: form.interactiveView,
            timeout: form.timeout,
            prohibitBacktracking: form.prohibitBacktracking,
            maxAttempts: form.maxAttempts,
            maxPoints: form.maxPoints,
            randomizeResponses: form.randomizeResponses,
            pointsLadder: form.pointsLadder,
            pointsLadderDeduction: form.pointsLadderDeduction,
        }

        // Add-only fields
        if (mode === 'add') {
            payload.title = selectedTerm?.name
            payload.termCode = form.termCode
        }

        onSave(payload)
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 space-y-2"
        >

            {/* Existing syllabus summary */}
            {mode === 'edit' && syllabus && (
                <div className="border border-border p-3 bg-muted space-y-0.5">
                    <p className="text-xs font-semibold">{syllabus.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                        {syllabus.termCode ?? '—'}
                    </p>
                </div>
            )}

            {/* Term picker (add only) */}
            {mode === 'add' && (
                <div className="space-y-2 p-3 border border-border focus-within:bg-input-focus focus-within:ring-1 focus-within:ring-ring">
                    <div>
                        <p className="text-xs font-medium mb-0.5">Term</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            The term associated with this syllabus. Each
                            syllabus can be associated with only one term.
                        </p>
                    </div>

                    <div className="relative">
                        <div className="relative flex items-center border border-input bg-input focus-within:ring-1 focus-within:ring-ring">
                            <input
                                ref={termInputRef}
                                value={termSearch}
                                placeholder="Search terms…"
                                autoComplete="off"
                                className="flex-1 h-8 px-3 text-xs bg-input outline-none placeholder:text-muted-foreground"
                                onChange={e => {
                                    setTermSearch(e.target.value)
                                    setForm(f => ({
                                        ...f,
                                        termCode: '',
                                    }))
                                    setTermOpen(true)
                                }}
                                onFocus={() => setTermOpen(true)}
                            />

                            {termSearch ? (
                                <button
                                    type="button"
                                    className="px-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setTermSearch('')
                                        setForm(f => ({
                                            ...f,
                                            termCode: '',
                                        }))
                                        termInputRef.current?.focus()
                                    }}
                                >
                                    <X className="h-4 w-4 shrink-0 hover:text-destructive" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="px-2 text-muted-foreground hover:text-foreground"
                                    onMouseDown={e => {
                                        e.preventDefault()
                                        setTermOpen(o => !o)
                                        termInputRef.current?.focus()
                                    }}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {termOpen && (
                            <div
                                ref={termMenuRef}
                                className="absolute z-50 top-full left-0 right-0 border border-popover-border bg-popover text-popover-foreground shadow-popover-shadow max-h-48 overflow-y-auto"
                            >
                                {filteredTerms.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-popover-foreground">
                                        No terms found.
                                    </p>
                                ) : (
                                    filteredTerms.map(term => (
                                        <button
                                            key={term.id}
                                            type="button"
                                            className={cn(
                                                'w-full text-left px-3 py-2 text-xs hover:bg-muted-hover transition-colors',
                                                form.termCode === term.code &&
                                                'bg-popover font-medium',
                                            )}
                                            onMouseDown={e => {
                                                e.preventDefault()

                                                setForm(f => ({
                                                    ...f,
                                                    termCode: term.code,
                                                }))

                                                setTermSearch(term.name)
                                                setTermOpen(false)
                                            }}
                                        >
                                            {term.name}
                                            <span className="ml-2 text-sidebar-accent-foreground">
                                                ({term.code})
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Office hours */}
            <div className="space-y-2 p-3 border border-border">
                <div>
                    <p className="text-xs font-medium mb-0.5">
                        Office Hours{' '}
                        <span className="text-muted-foreground">
                            (optional)
                        </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        The office hours associated with this term
                        (visible to students).
                    </p>
                </div>
                <TextEditor
                    content={form.officeHours}
                    onChange={!locked ? f('officeHours') : () => {}}
                    className="rounded-none focus-within:bg-input-focus focus-within:ring-1 focus-within:ring-primary"
                />
            </div>

            {/* Student view */}
            <div className="space-y-2 p-3 border border-border">
                <div>
                    <p className="text-xs font-medium mb-0.5">
                        Student View
                    </p>

                    <p className="text-[11px] text-muted-foreground leading-snug">
                        The student view mode for this syllabus.
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    {([
                        {
                            value: true,
                            label: 'Interactive Mode',
                            desc:
                                'Students step through blocked content sequentially with embedded quiz questions and grade passback.',
                        },
                        {
                            value: false,
                            label: 'Traditional Mode',
                            desc:
                                'A static, navigable document students read at their own pace.',
                        },
                    ] as const).map(({ value, label, desc }) => {
                        const checked = form.interactiveView === value

                        return (
                            <label
                                key={String(value)}
                                className={cn(
                                    'flex items-start gap-2.5 border p-3 cursor-pointer transition-colors',
                                    checked
                                        ? 'border-primary bg-muted-selected'
                                        : 'border-border hover:bg-muted-hover',
                                    locked &&
                                    'pointer-events-none opacity-60',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="view"
                                    checked={checked}
                                    onChange={() =>
                                        setForm(f => ({
                                            ...f,
                                            interactiveView: value,
                                        }))
                                    }
                                    className="sr-only"
                                />

                                <div
                                    className={cn(
                                        'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center',
                                        checked
                                            ? 'border-primary'
                                            : 'border-muted-foreground/40',
                                    )}
                                >
                                    {checked && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    )}
                                </div>

                                <div>
                                    <p className="text-xs font-medium mb-0.5">
                                        {label}
                                    </p>

                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        {desc}
                                    </p>
                                </div>
                            </label>
                        )
                    })}
                </div>
            </div>

            {/* Interactive settings */}
            {form.interactiveView && (
                <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Interactive Settings
                    </p>

                    <Input
                        label="Timeout (ms)"
                        description="The amount of time in milliseconds a student must wait before the Next button becomes active."
                        type="number"
                        min={0}
                        step={1000}
                        value={form.timeout}
                        disabled={locked}
                        onChange={e =>
                            setForm(prev => ({
                                ...prev,
                                timeout: Number(e.target.value),
                            }))
                        }
                    />

                    <Input
                        label="Max Attempts"
                        description="The maximum number of attempts allowed per response block. Set to 0 for unlimited."
                        type="number"
                        min={0}
                        step={1}
                        value={form.maxAttempts}
                        disabled={locked}
                        onChange={e =>
                            setForm(prev => ({
                                ...prev,
                                maxAttempts: Number(e.target.value),
                            }))
                        }
                    />

                    <Input
                        label="Max Points"
                        description="The maximum number of points available per response block."
                        type="number"
                        min={0}
                        step={1}
                        value={form.maxPoints}
                        disabled={locked}
                        onChange={e =>
                            setForm(prev => ({
                                ...prev,
                                maxPoints: Number(e.target.value),
                            }))
                        }
                    />

                    <Switch
                        label="Prohibit Backtracking"
                        description="Prevents students from revisiting previously completed blocks until they've reviewed the entire syllabus."
                        checked={form.prohibitBacktracking}
                        disabled={locked}
                        onCheckedChange={f('prohibitBacktracking')}
                    />

                    <Switch
                        label="Randomize Responses"
                        description="Shuffles the response choices within each response block on every attempt."
                        checked={form.randomizeResponses}
                        disabled={locked}
                        onCheckedChange={f('randomizeResponses')}
                    />

                    <Switch
                        label="Points Ladder"
                        description="Deducts a point for each incorrect response within a response block."
                        checked={form.pointsLadder}
                        disabled={locked}
                        onCheckedChange={f('pointsLadder')}
                    />

                    <Input
                        label="Points Ladder Deduction"
                        description="The number of points deducted per incorrect response."
                        type="number"
                        min={0}
                        max={100}
                        value={form.pointsLadderDeduction}
                        disabled={locked || !form.pointsLadder}
                        onChange={e =>
                            setForm(prev => ({
                                ...prev,
                                pointsLadderDeduction: Number(e.target.value),
                            }))
                        }
                    />
                </div>
            )}

            {!locked && (
                <div className="pt-2">
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-none h-9 bg-primary text-primary-foreground hover:bg-primary/80"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                {mode === 'add'
                                    ? 'Creating…'
                                    : 'Saving…'}
                            </>
                        ) : (
                            mode === 'add'
                                ? 'Create Syllabus'
                                : 'Save Syllabus'
                        )}
                    </Button>
                </div>
            )}
        </form>
    )
}

// ── Column 1: Syllabus Management ─────────────────────────────────────────────

export function SyllabusColumn({
    syllabi, syllabiLoading, selectedId,
    col1Mode, setCol1Mode,
    terms, syllabus, locked,
    onSelectSyllabus, onEditSyllabus,
    onCreateSyllabus, onUpdateSyllabus, onDeleteSyllabus, onToggleLock,
    isCreating, isUpdating,
    gradingScales, gradingScalesLoading,
    onCreateGradingScale, onUpdateGradingScale, onDeleteGradingScale,
    isCreatingGradingScale, isUpdatingGradingScale,
}: {
    syllabi: MasterSyllabus[]
    syllabiLoading: boolean
    selectedId?: string
    col1Mode: Col1Mode
    setCol1Mode: (m: Col1Mode) => void
    terms: { id: string; name: string; code: string; isActive?: boolean }[]
    syllabus?: MasterSyllabus
    locked: boolean
    onSelectSyllabus: (id: string) => void
    onEditSyllabus: (id: string) => void
    onCreateSyllabus: (body: Record<string, unknown>) => void
    onUpdateSyllabus: (body: Record<string, unknown>) => void
    onDeleteSyllabus: (syllabusId: string) => void
    onToggleLock: (syllabusId: string) => void
    isCreating: boolean
    isUpdating: boolean
    gradingScales: GradingScale[]
    gradingScalesLoading: boolean
    onCreateGradingScale: (body: { name: string; grades: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    onUpdateGradingScale: (id: string, body: { name?: string; grades?: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    onDeleteGradingScale: (id: string) => void
    isCreatingGradingScale: boolean
    isUpdatingGradingScale: boolean
}) {
    const [editingScale, setEditingScale] = React.useState<GradingScale | null>(null)
    const [sylEditDeleteOpen, setSylEditDeleteOpen] = React.useState(false)

    const isGradingScaleMode = col1Mode === 'addGradingScale' || col1Mode === 'editGradingScale'

    return (
        <div className="column bg-column-left w-full md:w-64 xl:w-96 md:shrink-0 md:border-r flex flex-col overflow-hidden">
            {isGradingScaleMode && (
                <GradingScaleColumn
                    col1Mode={col1Mode}
                    setCol1Mode={setCol1Mode}
                    editingScale={editingScale}
                    onCreate={onCreateGradingScale}
                    onUpdate={onUpdateGradingScale}
                    onDelete={onDeleteGradingScale}
                    isCreating={isCreatingGradingScale}
                    isUpdating={isUpdatingGradingScale}
                />
            )}

            {col1Mode === 'listSyllabi' && (
                <>
                    <ColHeader title="Syllabi" subtitle="" icon={<BookOpen className="h-5 w-5" />}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1 px-2 h-7 text-xs font-medium bg-black/10 hover:bg-black/20 rounded-sm transition-colors shrink-0">
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setCol1Mode('addSyllabus')} className="focus:bg-muted-hover">
                                    <BookOpen className="h-4 w-4 mr-2" />Create Syllabus
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCol1Mode('addGradingScale')} className="focus:bg-muted-hover">
                                    <BarChart3 className="h-4 w-4 mr-2" />Create Grading Scale
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </ColHeader>
                    <SyllabusList
                        syllabi={syllabi}
                        isLoading={syllabiLoading}
                        selectedId={selectedId}
                        onSelect={onSelectSyllabus}
                        onEdit={onEditSyllabus}
                        onLock={onToggleLock}
                        onDelete={onDeleteSyllabus}
                        gradingScales={gradingScales}
                        gradingScalesLoading={gradingScalesLoading}
                        onEditGradingScale={scale => { setEditingScale(scale); setCol1Mode('editGradingScale') }}
                        onDeleteGradingScale={onDeleteGradingScale}
                    />
                </>
            )}

            {col1Mode === 'addSyllabus' && (
                <>
                    <ColHeader title="Create Syllabus" subtitle="" icon={<BookOpen className="h-5 w-5" />} onBack={() => setCol1Mode('listSyllabi')} />
                    <SyllabusForm mode="add" terms={terms} syllabi={syllabi} onSave={onCreateSyllabus} isSaving={isCreating} />
                </>
            )}

            {col1Mode === 'editSyllabus' && (
                <>
                    <ColHeader title="Edit Syllabus" subtitle="" icon={<BookOpen className="h-5 w-5" />} onBack={() => setCol1Mode('listSyllabi')}>
                        {syllabus && !locked && (
                            <DeleteButton onClick={() => setSylEditDeleteOpen(true)} />
                        )}
                    </ColHeader>
                    {syllabus ? (
                        <SyllabusForm
                            mode="edit"
                            syllabus={syllabus}
                            locked={locked}
                            onSave={onUpdateSyllabus}
                            isSaving={isUpdating}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
            )}

            {/* Syllabus edit delete confirmation */}
            <Dialog open={sylEditDeleteOpen} onOpenChange={v => !v && setSylEditDeleteOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Syllabus</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{syllabus?.title}</strong> and all its segments and blocks. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSylEditDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => {
                            if (syllabus) { onDeleteSyllabus(syllabus.id); setCol1Mode('listSyllabi') }
                            setSylEditDeleteOpen(false)
                        }}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
