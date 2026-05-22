import React from 'react'
import { BarChart3, Loader2, MoreHorizontal, Plus, Trash2, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ColHeader, AddButton, Col1Mode } from './shared'
import type { GradingScale, GradingScaleGrade } from '@syllabee/types'

type GradeRow = { letter: string; minPercent: string; maxPercent: string }

function emptyRow(): GradeRow { return { letter: '', minPercent: '', maxPercent: '' } }

// ── Grading Scale List ────────────────────────────────────────────────────────

function GradingScaleList({ onBack, scales, isLoading, onAdd, onEdit, onDelete }: {
    onBack: () => void
    scales: GradingScale[]
    isLoading: boolean
    onAdd: () => void
    onEdit: (scale: GradingScale) => void
    onDelete: (id: string) => void
}) {
    const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
    const deleteTarget = scales.find(s => s.id === deleteConfirmId)

    return (
        <>
            <ColHeader title="Grading Scales" subtitle="" icon={<BarChart3 className="h-5 w-5" />} onBack={onBack}>
                <AddButton onClick={onAdd} />
            </ColHeader>

            <div className="flex-1 overflow-y-auto p-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…
                    </div>
                ) : scales.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-8 text-center">
                        No grading scales yet — add one.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {scales.map(scale => (
                            <div key={scale.id} className="flex items-stretch border border-border">
                                <div className="flex flex-col items-center bg-primary gap-1 py-2 px-1.5 shrink-0">
                                    <BarChart3 className="h-4 w-4 text-black my-1.5 shrink-0" />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1.5 text-black bg-black/10 hover:bg-black/20 rounded-sm transition-colors">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" side="right">
                                            <DropdownMenuItem onClick={() => onEdit(scale)}>
                                                <Pencil className="h-4 w-4 mr-2" />Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-500 focus:text-red-600 focus:bg-red-500/10"
                                                onClick={() => setDeleteConfirmId(scale.id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="flex flex-col justify-center flex-1 min-w-0 px-3 py-2.5">
                                    <p className="text-xs font-medium truncate">{scale.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {(scale.grades ?? []).length} grade{(scale.grades ?? []).length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={!!deleteConfirmId} onOpenChange={v => !v && setDeleteConfirmId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Grading Scale</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{deleteTarget?.name}</strong>. Any blocks using this scale will lose their grade reference. This action cannot be undone.
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

// ── Grade Rows Editor ─────────────────────────────────────────────────────────

function GradeRowsEditor({ rows, onChange, disabled }: {
    rows: GradeRow[]
    onChange: (rows: GradeRow[]) => void
    disabled?: boolean
}) {
    function update(i: number, field: keyof GradeRow, val: string) {
        const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
        onChange(next)
    }

    function remove(i: number) {
        onChange(rows.filter((_, idx) => idx !== i))
    }

    return (
        <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-0.5">
                <span>Letter</span>
                <span>Min %</span>
                <span>Max %</span>
                <span />
            </div>
            {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                    <Input
                        value={row.letter}
                        onChange={e => update(i, 'letter', e.target.value)}
                        disabled={disabled}
                        placeholder="A"
                        className="h-7 text-xs rounded-none px-2"
                    />
                    <Input
                        type="number"
                        value={row.minPercent}
                        onChange={e => update(i, 'minPercent', e.target.value)}
                        disabled={disabled}
                        placeholder="90"
                        min={0}
                        max={100}
                        className="h-7 text-xs rounded-none px-2"
                        step="any"
                    />
                    <Input
                        type="number"
                        value={row.maxPercent}
                        onChange={e => update(i, 'maxPercent', e.target.value)}
                        disabled={disabled}
                        placeholder="100"
                        min={0}
                        max={100}
                        className="h-7 text-xs rounded-none px-2"
                        step="any"
                    />
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => remove(i)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
            {!disabled && (
                <button
                    type="button"
                    onClick={() => onChange([...rows, emptyRow()])}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                    <Plus className="h-3 w-3" />Add Grade
                </button>
            )}
        </div>
    )
}

// ── Add Form ──────────────────────────────────────────────────────────────────

function GradingScaleAddForm({ onBack, onCreate, isSaving }: {
    onBack: () => void
    onCreate: (body: { name: string; grades: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    isSaving: boolean
}) {
    const [name, setName] = React.useState('')
    const [rows, setRows] = React.useState<GradeRow[]>([emptyRow()])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) { toast.error('Name is required'); return }
        if (rows.length === 0) { toast.error('At least one grade is required'); return }
        for (const r of rows) {
            if (!r.letter.trim() || r.minPercent === '' || r.maxPercent === '') {
                toast.error('All grade rows must be filled in')
                return
            }
        }
        onCreate({
            name: name.trim(),
            grades: rows.map(r => ({
                letter: r.letter.trim(),
                minPercent: Number(r.minPercent),
                maxPercent: Number(r.maxPercent),
            })),
        })
    }

    return (
        <>
            <ColHeader title="Add Grading Scale" subtitle="" icon={<BarChart3 className="h-5 w-5" />} onBack={onBack} />
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Standard Grading Scale"
                        className="h-8 text-xs rounded-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Grades</Label>
                    <GradeRowsEditor rows={rows} onChange={setRows} />
                </div>

                <Button type="submit" disabled={isSaving} className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                    {isSaving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creating…</> : 'Create Grading Scale'}
                </Button>
            </form>
        </>
    )
}

// ── Edit Form ─────────────────────────────────────────────────────────────────

function GradingScaleEditForm({ scale, onBack, onUpdate, onDelete, isSaving }: {
    scale: GradingScale
    onBack: () => void
    onUpdate: (id: string, body: { name?: string; grades?: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    onDelete: (id: string) => void
    isSaving: boolean
}) {
    const [name, setName] = React.useState(scale.name)
    const [rows, setRows] = React.useState<GradeRow[]>(
        (scale.grades ?? []).map(g => ({ letter: g.letter, minPercent: String(g.minPercent), maxPercent: String(g.maxPercent) }))
    )
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

    React.useEffect(() => {
        setName(scale.name)
        setRows((scale.grades ?? []).map(g => ({ letter: g.letter, minPercent: String(g.minPercent), maxPercent: String(g.maxPercent) })))
        setDeleteConfirmOpen(false)
    }, [scale.id])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) { toast.error('Name is required'); return }
        if (rows.length === 0) { toast.error('At least one grade is required'); return }
        for (const r of rows) {
            if (!r.letter.trim() || r.minPercent === '' || r.maxPercent === '') {
                toast.error('All grade rows must be filled in')
                return
            }
        }
        onUpdate(scale.id, {
            name: name.trim(),
            grades: rows.map(r => ({
                letter: r.letter.trim(),
                minPercent: Number(r.minPercent),
                maxPercent: Number(r.maxPercent),
            })),
        })
    }

    return (
        <>
            <ColHeader title="Edit Grading Scale" subtitle="" icon={<BarChart3 className="h-5 w-5" />} onBack={onBack} />
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Standard Grading Scale"
                        className="h-8 text-xs rounded-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Grades</Label>
                    <GradeRowsEditor rows={rows} onChange={setRows} />
                </div>

                <div className="space-y-2 pt-2">
                    <Button type="submit" disabled={isSaving} className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                        {isSaving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</> : 'Save Grading Scale'}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="w-full rounded-none h-9 text-xs"
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Grading Scale
                    </Button>
                </div>
            </form>

            <Dialog open={deleteConfirmOpen} onOpenChange={v => !v && setDeleteConfirmOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Grading Scale</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{scale.name}</strong>. Any blocks using this scale will lose their grade reference. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => { setDeleteConfirmOpen(false); onDelete(scale.id) }}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ── Column orchestrator ───────────────────────────────────────────────────────

export function GradingScaleColumn({ col1Mode, setCol1Mode, scales, isLoading, onCreate, onUpdate, onDelete, isCreating, isUpdating }: {
    col1Mode: Col1Mode
    setCol1Mode: (m: Col1Mode) => void
    scales: GradingScale[]
    isLoading: boolean
    onCreate: (body: { name: string; grades: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    onUpdate: (id: string, body: { name?: string; grades?: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    onDelete: (id: string) => void
    isCreating: boolean
    isUpdating: boolean
}) {
    const [editingScale, setEditingScale] = React.useState<GradingScale | null>(null)

    return (
        <>
            {col1Mode === 'grading-scales' && (
                <GradingScaleList
                    onBack={() => setCol1Mode('list')}
                    scales={scales}
                    isLoading={isLoading}
                    onAdd={() => setCol1Mode('grading-scale-add')}
                    onEdit={scale => { setEditingScale(scale); setCol1Mode('grading-scale-edit') }}
                    onDelete={onDelete}
                />
            )}

            {col1Mode === 'grading-scale-add' && (
                <GradingScaleAddForm
                    onBack={() => setCol1Mode('grading-scales')}
                    onCreate={onCreate}
                    isSaving={isCreating}
                />
            )}

            {col1Mode === 'grading-scale-edit' && editingScale && (
                <GradingScaleEditForm
                    scale={editingScale}
                    onBack={() => setCol1Mode('grading-scales')}
                    onUpdate={onUpdate}
                    onDelete={id => { onDelete(id); setCol1Mode('grading-scales') }}
                    isSaving={isUpdating}
                />
            )}
        </>
    )
}
