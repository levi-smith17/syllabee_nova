import React from 'react'
import { BarChart3, Loader2, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ColHeader, DeleteButton, Col1Mode } from './shared'
import type { GradingScale, GradingScaleGrade } from '@syllabee/types'
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

type GradeRow = { letter: string; minPercent: string; maxPercent: string }

function emptyRow(): GradeRow { return { letter: '', minPercent: '', maxPercent: '' } }

// ── Grade Rows Editor ─────────────────────────────────────────────────────────

function GradeRowsEditor({ rows, onChange, disabled }: {
    rows: GradeRow[]
    onChange: (rows: GradeRow[]) => void
    disabled?: boolean
}) {
    function update(i: number, field: keyof GradeRow, val: string) {
        onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
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
                    <Input value={row.letter} onChange={e => update(i, 'letter', e.target.value)}
                        disabled={disabled} placeholder="A" className="h-7 text-xs rounded-none px-2" />
                    <Input type="number" value={row.minPercent} onChange={e => update(i, 'minPercent', e.target.value)}
                        disabled={disabled} placeholder="90" min={0} max={100} step="any"
                        className="h-7 text-xs rounded-none px-2" />
                    <Input type="number" value={row.maxPercent} onChange={e => update(i, 'maxPercent', e.target.value)}
                        disabled={disabled} placeholder="100" min={0} max={100} step="any"
                        className="h-7 text-xs rounded-none px-2" />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" disabled={disabled}
                                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive/75 hover:bg-destructive/10"
                                    onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Delete Row
                        </TooltipContent>
                    </Tooltip>
                </div>
            ))}
            {!disabled && (
                <Button type="button" variant="outline" onClick={() => onChange([...rows, emptyRow()])}
                    className="flex items-center gap-1 rounded-none text-xs text-muted-foreground transition-colors mt-1 w-full">
                    <Plus className="h-3.5. w-3.5" />Add Row
                </Button>
            )}
        </div>
    )
}

// ── Add Form (body only — ColHeader rendered by column) ───────────────────────

export function GradingScaleAddForm({ onCreate, isSaving }: {
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
                toast.error('All grade rows must be filled in'); return
            }
        }
        onCreate({
            name: name.trim(),
            grades: rows.map(r => ({ letter: r.letter.trim(), minPercent: Number(r.minPercent), maxPercent: Number(r.maxPercent) })),
        })
    }

    return (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Standard Grading Scale" className="h-8 text-xs rounded-none" />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Grades</Label>
                <GradeRowsEditor rows={rows} onChange={setRows} />
            </div>
            <Button type="submit" disabled={isSaving} className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                {isSaving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creating…</> : 'Create Grading Scale'}
            </Button>
        </form>
    )
}

// ── Edit Form (body only — ColHeader + trash rendered by column) ──────────────

export function GradingScaleEditForm({ scale, onUpdate, isSaving }: {
    scale: GradingScale
    onUpdate: (id: string, body: { name?: string; grades?: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    isSaving: boolean
}) {
    const [name, setName] = React.useState(scale.name)
    const [rows, setRows] = React.useState<GradeRow[]>(
        [...(scale.grades ?? [])].sort((a, b) => b.maxPercent - a.maxPercent)
            .map(g => ({ letter: g.letter, minPercent: String(g.minPercent), maxPercent: String(g.maxPercent) }))
    )

    React.useEffect(() => {
        setName(scale.name)
        setRows(
            [...(scale.grades ?? [])].sort((a, b) => b.maxPercent - a.maxPercent)
                .map(g => ({ letter: g.letter, minPercent: String(g.minPercent), maxPercent: String(g.maxPercent) }))
        )
    }, [scale.id])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) { toast.error('Name is required'); return }
        if (rows.length === 0) { toast.error('At least one grade is required'); return }
        for (const r of rows) {
            if (!r.letter.trim() || r.minPercent === '' || r.maxPercent === '') {
                toast.error('All grade rows must be filled in'); return
            }
        }
        onUpdate(scale.id, {
            name: name.trim(),
            grades: rows.map(r => ({ letter: r.letter.trim(), minPercent: Number(r.minPercent), maxPercent: Number(r.maxPercent) })),
        })
    }

    return (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Standard Grading Scale" className="h-8 text-xs rounded-none" />
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Grades</Label>
                <GradeRowsEditor rows={rows} onChange={setRows} />
            </div>
            <Button type="submit" disabled={isSaving} className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                {isSaving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</> : 'Save Grading Scale'}
            </Button>
        </form>
    )
}

// ── Column orchestrator ───────────────────────────────────────────────────────

export function GradingScaleColumn({
    col1Mode, setCol1Mode,
    editingScale,
    onCreate, onUpdate, onDelete,
    isCreating, isUpdating,
}: {
    col1Mode: Col1Mode
    setCol1Mode: (m: Col1Mode) => void
    editingScale?: GradingScale | null
    onCreate: (body: { name: string; grades: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    onUpdate: (id: string, body: { name?: string; grades?: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    onDelete: (id: string) => void
    isCreating: boolean
    isUpdating: boolean
}) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

    return (
        <>
            {col1Mode === 'grading-scale-add' && (
                <>
                    <ColHeader title="Add Grading Scale" subtitle="" icon={<BarChart3 className="h-5 w-5" />}
                        onBack={() => setCol1Mode('list')} />
                    <GradingScaleAddForm onCreate={onCreate} isSaving={isCreating} />
                </>
            )}

            {col1Mode === 'grading-scale-edit' && editingScale && (
                <>
                    <ColHeader title="Edit Grading Scale" subtitle="" icon={<BarChart3 className="h-5 w-5" />}
                        onBack={() => setCol1Mode('list')}>
                        <DeleteButton onClick={() => setDeleteConfirmOpen(true)} />
                    </ColHeader>
                    <GradingScaleEditForm scale={editingScale} onUpdate={onUpdate} isSaving={isUpdating} />
                </>
            )}

            <Dialog open={deleteConfirmOpen} onOpenChange={v => !v && setDeleteConfirmOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Grading Scale</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{editingScale?.name}</strong>. Any blocks using this scale will lose their grade reference. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => {
                            if (editingScale) { onDelete(editingScale.id); setCol1Mode('list') }
                            setDeleteConfirmOpen(false)
                        }}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
