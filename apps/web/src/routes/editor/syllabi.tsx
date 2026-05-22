import React from 'react'
import { Lock, Unlock, Trash2, Pencil, Search, X, ChevronDown, Loader2, MoreHorizontal, BookOpen, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ColHeader, AddButton, Col1Mode } from './shared'
import { GradingScaleColumn } from './grading-scales'
import type { MasterSyllabus, GradingScale, GradingScaleGrade } from '@syllabee/types'

// ── Syllabi list ──────────────────────────────────────────────────────────────

function SyllabusList({ syllabi, isLoading, selectedId, onSelect, onEdit, onLock, onDelete }: {
    syllabi: MasterSyllabus[]
    isLoading: boolean
    selectedId?: string
    onSelect: (id: string) => void
    onEdit: (id: string) => void
    onLock: (id: string) => void
    onDelete: (id: string) => void
}) {
    const [search, setSearch] = React.useState('')
    const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        const arr = !q ? syllabi : syllabi.filter(s =>
            s.title.toLowerCase().includes(q) || (s.termCode ?? '').toLowerCase().includes(q)
        )
        return [...arr].sort((a, b) => (b.termCode ?? '').localeCompare(a.termCode ?? ''))
    }, [syllabi, search])

    return (
        <>
            <div className="shrink-0 px-3 py-2 border-b">
                <div className="flex items-center h-7 border border-transparent bg-background/60 focus-within:border-primary transition-colors">
                    <Search className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground pointer-events-none" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search…"
                        className="flex-1 min-w-0 bg-transparent text-xs px-2 outline-none placeholder:text-muted-foreground"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="mr-1 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-8 text-center">
                        {syllabi.length === 0 ? 'No syllabi yet — add one.' : 'No results.'}
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filtered.map(s => (
                            <div
                                key={s.id}
                                className={cn(
                                    'flex items-stretch border transition-colors',
                                    s.id === selectedId ? 'border-primary bg-muted' : 'border-border',
                                )}
                            >
                                {/* Action buttons — outside the clickable area to avoid event propagation */}
                                <div className="flex flex-col items-center bg-primary gap-1 py-2 px-1.5 shrink-0">
                                    <BookOpen className="h-4 w-4 text-black shrink-0 my-1.5" />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1.5 text-black bg-black/10 hover:bg-black/20 rounded-sm transition-colors">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" side="right">
                                            <DropdownMenuItem onClick={() => onEdit(s.id)}>
                                                <Pencil className="h-4 w-4 mr-2" />Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-500 focus:text-red-600 focus:bg-red-500/10"
                                                onClick={() => setDeleteConfirmId(s.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <button
                                        className="p-1.5 text-black bg-black/10 hover:bg-black/20 rounded-sm transition-colors"
                                        onClick={() => onLock(s.id)}
                                        title={s.locked ? 'Unlock syllabus' : 'Lock syllabus'}
                                    >
                                        {s.locked
                                            ? <Lock className="h-4 w-4" />
                                            : <Unlock className="h-4 w-4" />}
                                    </button>
                                </div>

                                {/* Clickable selection area */}
                                <div
                                    className="flex items-start gap-1.5 flex-1 min-w-0 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
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
                )}
            </div>

            {/* Delete confirmation */}
            <Dialog open={!!deleteConfirmId} onOpenChange={v => !v && setDeleteConfirmId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Syllabus</DialogTitle>
                        <DialogDescription>
                            This will permanently delete this syllabus and all its segments and blocks. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => { onDelete(deleteConfirmId!); setDeleteConfirmId(null) }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ── Syllabus add form ─────────────────────────────────────────────────────────

function SyllabusAddForm({ terms, syllabi, onSave, isSaving }: {
    terms: { id: string; name: string; code: string; isActive?: boolean }[]
    syllabi: MasterSyllabus[]
    onSave: (body: Record<string, unknown>) => void
    isSaving: boolean
}) {
    const [termCode, setTermCode] = React.useState('')
    const [termSearch, setTermSearch] = React.useState('')
    const [termOpen, setTermOpen] = React.useState(false)
    const [interactiveView, setInteractiveView] = React.useState(false)
    const [officeHours, setOfficeHours] = React.useState('')
    const termInputRef = React.useRef<HTMLInputElement>(null)
    const termMenuRef = React.useRef<HTMLDivElement>(null)

    const usedTermCodes = React.useMemo(
        () => new Set(syllabi.map(s => s.termCode).filter(Boolean)),
        [syllabi],
    )

    const sortedTerms = React.useMemo(
        () => [...terms]
            .filter(t => t.isActive !== false && !usedTermCodes.has(t.code))
            .sort((a, b) => b.code.localeCompare(a.code)),
        [terms, usedTermCodes],
    )
    const filteredTerms = React.useMemo(() => {
        const q = termSearch.toLowerCase()
        return q ? sortedTerms.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)) : sortedTerms
    }, [sortedTerms, termSearch])
    const selectedTerm = sortedTerms.find(t => t.code === termCode) ?? null

    React.useEffect(() => {
        if (!termOpen) return
        function handle(e: MouseEvent) {
            if (
                termInputRef.current && !termInputRef.current.contains(e.target as Node) &&
                termMenuRef.current && !termMenuRef.current.contains(e.target as Node)
            ) { setTermOpen(false); if (!termCode) setTermSearch('') }
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [termOpen, termCode])

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!termCode || !selectedTerm) { toast.error('Term is required'); return }
        onSave({ termCode, interactiveView, title: selectedTerm.name, officeHours: officeHours || undefined })
    }

    return (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs">Term</Label>
                <div className="relative">
                    <div className="relative flex items-center border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
                        <input
                            ref={termInputRef}
                            value={termSearch}
                            placeholder="Search terms…"
                            autoComplete="off"
                            className="flex-1 h-8 px-3 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                            onChange={e => { setTermSearch(e.target.value); setTermCode(''); setTermOpen(true) }}
                            onFocus={() => setTermOpen(true)}
                        />
                        {termSearch ? (
                            <button type="button" className="px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => { setTermSearch(''); setTermCode(''); termInputRef.current?.focus() }}>
                                <X className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button type="button" className="px-2 text-muted-foreground hover:text-foreground"
                                onMouseDown={e => { e.preventDefault(); setTermOpen(o => !o); termInputRef.current?.focus() }}>
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {termOpen && (
                        <div ref={termMenuRef} className="absolute z-50 top-full left-0 right-0 border border-input bg-popover shadow-md max-h-48 overflow-y-auto">
                            {filteredTerms.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-muted-foreground">No terms found.</p>
                            ) : filteredTerms.map(term => (
                                <button key={term.id} type="button"
                                    className={cn('w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors',
                                        termCode === term.code && 'bg-accent font-medium')}
                                    onMouseDown={e => { e.preventDefault(); setTermCode(term.code); setTermSearch(term.name); setTermOpen(false) }}>
                                    {term.name}<span className="ml-2 text-muted-foreground">{term.code}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Office Hours <span className="text-muted-foreground">(optional)</span></Label>
                <RichTextEditor
                    content={officeHours}
                    onChange={setOfficeHours}
                    className="rounded-none"
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Student View</Label>
                <div className="flex flex-col gap-2">
                    {([
                        { value: false, label: 'Interactive Syllabus', desc: 'Students step through content sequentially with embedded quiz questions and grade passback.' },
                        { value: true,  label: 'Traditional Syllabus',  desc: 'A static, navigable document students read at their own pace.' },
                    ] as const).map(({ value, label, desc }) => {
                        const checked = interactiveView === value
                        return (
                            <label key={String(value)} className={cn(
                                'flex items-start gap-2.5 border p-3 cursor-pointer transition-colors',
                                checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                            )}>
                                <input type="radio" name="view" checked={checked} onChange={() => setInteractiveView(value)} className="sr-only" />
                                <div className={cn('mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center',
                                    checked ? 'border-primary' : 'border-muted-foreground/40')}>
                                    {checked && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                </div>
                                <div>
                                    <p className="text-xs font-medium mb-0.5">{label}</p>
                                    <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
                                </div>
                            </label>
                        )
                    })}
                </div>
            </div>

            <Button type="submit" disabled={isSaving} className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                {isSaving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creating…</> : 'Create Syllabus'}
            </Button>
        </form>
    )
}

// ── Syllabus edit form ────────────────────────────────────────────────────────

function SyllabusEditForm({ syllabus, locked, onSave, onDelete, isSaving }: {
    syllabus: MasterSyllabus
    locked: boolean
    onSave: (body: Record<string, unknown>) => void
    onDelete: () => void
    isSaving: boolean
}) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

    const [form, setForm] = React.useState({
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

    React.useEffect(() => {
        setDeleteConfirmOpen(false)
        setForm({
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
    }, [syllabus.id])

    function f<K extends keyof typeof form>(key: K) {
        return (val: (typeof form)[K]) => setForm(prev => ({ ...prev, [key]: val }))
    }

    return (
        <>
            <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="border border-border p-3 bg-muted/30 space-y-0.5">
                    <p className="text-xs font-semibold">{syllabus.title}</p>
                    <p className="text-[11px] text-muted-foreground">{syllabus.termCode ?? '—'}</p>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Office Hours</Label>
                    <RichTextEditor
                        content={form.officeHours}
                        onChange={!locked ? f('officeHours') : () => {}}
                        className="rounded-none"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Switch checked={form.interactiveView} disabled={locked} onCheckedChange={f('interactiveView')} />
                    <Label className="text-xs cursor-pointer">Interactive View</Label>
                </div>

                {form.interactiveView && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Interactive Settings</p>

                        {/* Timeout */}
                        <div className="border border-border p-3 space-y-2">
                            <div>
                                <p className="text-xs font-medium mb-0.5">Timeout (ms)</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    The amount of time in milliseconds a student must wait before the Next button becomes active. Has no effect in traditional view.
                                </p>
                            </div>
                            <Input type="number" min={0} value={form.timeout} disabled={locked}
                                onChange={e => setForm(prev => ({ ...prev, timeout: Number(e.target.value) }))}
                                className="h-8 text-xs rounded-none w-28" />
                        </div>

                        {/* Max Attempts */}
                        <div className="border border-border p-3 space-y-2">
                            <div>
                                <p className="text-xs font-medium mb-0.5">Max Attempts</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    The maximum number of attempts allowed per response block. Set to 0 for unlimited. Can be overridden at the block level.
                                </p>
                            </div>
                            <Input type="number" min={0} value={form.maxAttempts} disabled={locked}
                                onChange={e => setForm(prev => ({ ...prev, maxAttempts: Number(e.target.value) }))}
                                className="h-8 text-xs rounded-none w-28" />
                        </div>

                        {/* Max Points */}
                        <div className="border border-border p-3 space-y-2">
                            <div>
                                <p className="text-xs font-medium mb-0.5">Max Points</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    The maximum number of points available per response block. Can be overridden at the block level.
                                </p>
                            </div>
                            <Input type="number" min={0} value={form.maxPoints} disabled={locked}
                                onChange={e => setForm(prev => ({ ...prev, maxPoints: Number(e.target.value) }))}
                                className="h-8 text-xs rounded-none w-28" />
                        </div>

                        {/* Prohibit Backtracking */}
                        <div className={cn('flex items-start gap-3 border p-3 transition-colors',
                            form.prohibitBacktracking ? 'border-primary bg-primary/5' : 'border-border')}>
                            <Switch checked={form.prohibitBacktracking} disabled={locked}
                                    onCheckedChange={f('prohibitBacktracking')} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium mb-0.5">Prohibit Backtracking</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Prevents students from revisiting previously completed blocks while on a response block. Also disables the Table of Contents for in-block navigation.
                                </p>
                            </div>
                        </div>

                        {/* Randomize Responses */}
                        <div className={cn('flex items-start gap-3 border p-3 transition-colors',
                            form.randomizeResponses ? 'border-primary bg-primary/5' : 'border-border')}>
                            <Switch checked={form.randomizeResponses} disabled={locked}
                                onCheckedChange={f('randomizeResponses')} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium mb-0.5">Randomize Responses</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Shuffles the response choices within each response block on every attempt.
                                </p>
                            </div>
                        </div>

                        {/* Points Ladder */}
                        <div className={cn('flex items-start gap-3 border p-3 transition-colors',
                            form.pointsLadder ? 'border-primary bg-primary/5' : 'border-border')}>
                            <Switch checked={form.pointsLadder} disabled={locked}
                                onCheckedChange={f('pointsLadder')} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-medium mb-0.5">Points Ladder</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    Deducts a point for each incorrect response within a response block. Requires max attempts to be less than the number of response choices; has no effect otherwise.
                                </p>
                            </div>
                        </div>

                        {/* Points Ladder Deduction */}
                        <div className={cn('border p-3 space-y-2 transition-opacity',
                            !form.pointsLadder && 'opacity-50 pointer-events-none')}>
                            <div>
                                <p className="text-xs font-medium mb-0.5">Points Ladder Deduction</p>
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                    The number of points deducted per incorrect response. Has no effect when Points Ladder is disabled.
                                </p>
                            </div>
                            <Input type="number" min={0} max={100} value={form.pointsLadderDeduction} disabled={locked}
                                onChange={e => setForm(prev => ({ ...prev, pointsLadderDeduction: Number(e.target.value) }))}
                                className="h-8 text-xs rounded-none w-28" />
                        </div>
                    </div>
                )}

                <div className="space-y-2 pt-2">
                    {!locked && (
                        <Button type="submit" disabled={isSaving} className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                            {isSaving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</> : 'Save Syllabus'}
                        </Button>
                    )}
                    {!locked && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setDeleteConfirmOpen(true)}
                            className="w-full rounded-none h-9 text-xs"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Syllabus
                        </Button>
                    )}
                </div>
            </form>

            <Dialog open={deleteConfirmOpen} onOpenChange={v => !v && setDeleteConfirmOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Syllabus</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{syllabus.title}</strong> and all its segments and blocks. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => { setDeleteConfirmOpen(false); onDelete() }}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
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
    const isGradingScaleMode = col1Mode === 'grading-scales' || col1Mode === 'grading-scale-add' || col1Mode === 'grading-scale-edit'

    return (
        <div className="w-full md:w-96 md:shrink-0 md:border-r flex flex-col overflow-hidden">
            {isGradingScaleMode && (
                <GradingScaleColumn
                    col1Mode={col1Mode}
                    setCol1Mode={setCol1Mode}
                    scales={gradingScales}
                    isLoading={gradingScalesLoading}
                    onCreate={onCreateGradingScale}
                    onUpdate={onUpdateGradingScale}
                    onDelete={onDeleteGradingScale}
                    isCreating={isCreatingGradingScale}
                    isUpdating={isUpdatingGradingScale}
                />
            )}

            {col1Mode === 'list' && (
                <>
                    <ColHeader title="Syllabi" subtitle="" icon={<BookOpen className="h-5 w-5" />}>
                        <button
                            onClick={() => setCol1Mode('grading-scales')}
                            title="Grading Scales"
                            className="p-1 text-black bg-black/10 hover:bg-black/20 rounded-sm transition-colors shrink-0"
                        >
                            <BarChart3 className="h-5 w-5" />
                        </button>
                        <AddButton onClick={() => setCol1Mode('add')} />
                    </ColHeader>
                    <SyllabusList
                        syllabi={syllabi}
                        isLoading={syllabiLoading}
                        selectedId={selectedId}
                        onSelect={onSelectSyllabus}
                        onEdit={onEditSyllabus}
                        onLock={id => onToggleLock(id)}
                        onDelete={id => onDeleteSyllabus(id)}
                    />
                </>
            )}

            {col1Mode === 'add' && (
                <>
                    <ColHeader title="New Syllabus" subtitle="" icon={<BookOpen className="h-5 w-5" />} onBack={() => setCol1Mode('list')} />
                    <SyllabusAddForm
                        terms={terms}
                        syllabi={syllabi}
                        onSave={onCreateSyllabus}
                        isSaving={isCreating}
                    />
                </>
            )}

            {col1Mode === 'edit' && (
                <>
                    <ColHeader title="Edit Syllabus" subtitle="" icon={<BookOpen className="h-5 w-5" />} onBack={() => setCol1Mode('list')} />
                    {syllabus ? (
                        <SyllabusEditForm
                            syllabus={syllabus}
                            locked={locked}
                            onSave={onUpdateSyllabus}
                            onDelete={() => onDeleteSyllabus(syllabus.id)}
                            isSaving={isUpdating}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
