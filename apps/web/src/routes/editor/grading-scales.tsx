import React from 'react'
import { useEffect, useRef } from "react"
import { BarChart3, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ColHeader, DeleteButton, Col1Mode } from './shared'
import type { GradingScale, GradingScaleGrade } from '@syllabee/types'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type GradeRow = { letter: string; minPercent: string; maxPercent: string }

function emptyRow(): GradeRow { return { letter: '', minPercent: '', maxPercent: '' } }

// ── Grade Rows Editor ─────────────────────────────────────────────────────────

function GradeRowsEditor({ rows, onChange, disabled }: {
    rows: GradeRow[]
    onChange: (rows: GradeRow[]) => void
    disabled?: boolean
}) {
    const inputRefs = useRef<(HTMLInputElement | null)[][]>([])

    function update(i: number, field: keyof GradeRow, val: string) {
        onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
    }

    const handleAddRow = () => {
        if (disabled) return
        onChange([...rows, emptyRow()])
        setTimeout(() => {
            const nextIndex = rows.length
            inputRefs.current[nextIndex]?.[0]?.focus()
        }, 0)
    }

    const handleDeleteRow = (indexToDelete: number) => {
        if (disabled) return

        let indexToFocus = -1
        let columnToFocus = 0

        if (inputRefs.current[indexToDelete]) {
            columnToFocus = inputRefs.current[indexToDelete].findIndex(
                (input) => input === document.activeElement
            )
            if (columnToFocus === -1) columnToFocus = 0
        }

        if (rows.length > 1) {
            indexToFocus = indexToDelete < rows.length - 1 ? indexToDelete : indexToDelete - 1
        }

        onChange(rows.filter((_, idx) => idx !== indexToDelete))

        if (indexToFocus !== -1) {
            setTimeout(() => {
                inputRefs.current[indexToFocus]?.[columnToFocus]?.focus()
            }, 0)
        }
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Find the row and column of the currently focused input element
            let currentRow = -1
            let currentCol = -1

            for (let r = 0; r < rows.length; r++) {
                if (!inputRefs.current[r]) continue
                const c = inputRefs.current[r].indexOf(document.activeElement as HTMLInputElement)
                if (c !== -1) {
                    currentRow = r
                    currentCol = c
                    break
                }
            }

            // If the user isn't focusing one of our grid inputs, ignore the keypress
            if (currentRow === -1 || currentCol === -1) return

            // --- 1. Arrow Key Grid Navigation ---
            if (event.key === "ArrowUp") {
                event.preventDefault()
                if (currentRow > 0) {
                    inputRefs.current[currentRow - 1]?.[currentCol]?.focus()
                }
            } else if (event.key === "ArrowDown") {
                event.preventDefault()
                if (currentRow < rows.length - 1) {
                    inputRefs.current[currentRow + 1]?.[currentCol]?.focus()
                }
            } else if (event.key === "ArrowLeft") {
                const cursorPosition = (document.activeElement as HTMLInputElement).selectionStart
                if ((cursorPosition === 0 || cursorPosition === null) && currentCol > 0) {
                    event.preventDefault()
                    inputRefs.current[currentRow]?.[currentCol - 1]?.focus()
                }
            } else if (event.key === "ArrowRight") {
                const cursorPosition = (document.activeElement as HTMLInputElement).selectionStart
                const textLength = (document.activeElement as HTMLInputElement).value.length
                if ((cursorPosition === textLength || cursorPosition === null) && currentCol < 2) {
                    event.preventDefault()
                    inputRefs.current[currentRow]?.[currentCol + 1]?.focus()
                }
            }

            // --- 2. Action Shortcuts (Alt + A / Alt + Backspace) ---
            if (disabled) return

            if (event.altKey && event.code === "KeyA") {
                event.preventDefault()
                handleAddRow()
            } else if (event.altKey && event.key === "Backspace") {
                event.preventDefault()
                handleDeleteRow(currentRow)
            }
        };

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [rows, disabled])

    return (
        <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground leading-snug">
                Delete Row:
                <kbd className="pointer-events-none select-none font-mono opacity-60 bg-background px-2 py-0.5 ml-1 border uppercase">
                    {typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "⌥" : "Alt"} + Backspace
                </kbd>
            </p>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-0.5">
                <span>Letter</span>
                <span>Min %</span>
                <span>Max %</span>
                <span />
            </div>
            {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                    <Input value={row.letter} className="h-7 text-xs rounded-none px-2"
                           ref={(el) => { if (!inputRefs.current[i]) inputRefs.current[i] = []; inputRefs.current[i][0] = el }}
                           onChange={e => update(i, 'letter', e.target.value)}
                           disabled={disabled} placeholder="A" onFocus={(e) => e.target.select()}  />
                    <Input type="number" value={row.minPercent} className="h-7 text-xs rounded-none px-2"
                           ref={(el) => { if (!inputRefs.current[i]) inputRefs.current[i] = []; inputRefs.current[i][1] = el }}
                           onChange={e => update(i, 'minPercent', e.target.value)}
                           disabled={disabled} placeholder="90" min={0} max={100} step="any"
                           onFocus={(e) => e.target.select()} />
                    <Input type="number" value={row.maxPercent} className="h-7 text-xs rounded-none px-2"
                           ref={(el) => { if (!inputRefs.current[i]) inputRefs.current[i] = []; inputRefs.current[i][2] = el }}
                           onChange={e => update(i, 'maxPercent', e.target.value)}
                           disabled={disabled} placeholder="100" min={0} max={100} step="any"
                           onFocus={(e) => e.target.select()} />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" disabled={disabled} tabIndex={-1}
                                    className="h-7 w-7 rounded-sm shrink-0 bg-destructive text-destructive-foreground hover:bg-destructive/70 transition-colors"
                                    onClick={() => handleDeleteRow(i)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            Delete Row
                        </TooltipContent>
                    </Tooltip>
                </div>
            ))}
            {!disabled && (
                <Button type="button" variant="ghost" onClick={handleAddRow}
                    className="flex items-center gap-1 rounded-none text-xs mt-1 w-full bg-muted hover:bg-muted/50 transition-colors">
                    <Plus className="h-4 w-4" />Add Row
                    <kbd className="pointer-events-none select-none font-mono opacity-60 bg-background px-2 py-0.5 ml-1 border">
                        {typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "⌥" : "Alt"} + A
                    </kbd>
                </Button>
            )}
        </div>
    )
}

function GradingScaleForm({ mode, scale, onSave, isSaving }: {
    mode: 'add' | 'edit'
    scale?: GradingScale
    onSave: (body: { name: string; grades: Omit<GradingScaleGrade, 'id' | 'scaleId'>[] }) => void
    isSaving: boolean
}) {
    const [form, setForm] = React.useState({
        name: scale?.name ?? '',
        rows: scale?.grades
            ? [...scale.grades]
                .sort((a, b) => b.maxPercent - a.maxPercent)
                .map(g => ({
                    letter: g.letter,
                    minPercent: String(g.minPercent),
                    maxPercent: String(g.maxPercent),
                }))
            : [emptyRow()],
    })

    React.useEffect(() => {
        if (!scale) return

        setForm({
            name: scale.name,
            rows: [...(scale.grades ?? [])]
                .sort((a, b) => b.maxPercent - a.maxPercent)
                .map(g => ({
                    letter: g.letter,
                    minPercent: String(g.minPercent),
                    maxPercent: String(g.maxPercent),
                })),
        })
    }, [scale?.id])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!form.name.trim()) {
            toast.error('Name is required')
            return
        }

        if (form.rows.length === 0) {
            toast.error('At least one grade is required')
            return
        }

        for (const r of form.rows) {
            if (!r.letter.trim() || r.minPercent === '' || r.maxPercent === '') {
                toast.error('All grade rows must be filled in')
                return
            }
        }

        onSave({
            name: form.name.trim(),
            grades: form.rows.map(r => ({
                letter: r.letter.trim(),
                minPercent: Number(r.minPercent),
                maxPercent: Number(r.maxPercent),
            })),
        })
    }

    return (
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-2">

            {/* Name */}
            <Input
                label="Name"
                description="The name of this grading scale (not visible to students)."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Standard Grading Scale"
                className="h-8 text-xs rounded-none bg-input"
            />

            {/* Grades */}
            <div className="space-y-2 p-3 border border-border focus-within:bg-input-focus focus-within:ring-1 focus-within:ring-primary">
                <div>
                    <p className="text-xs font-medium mb-0.5">Grades</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        Define the grading scale by entering the score ranges and their corresponding letter grades.
                    </p>
                </div>

                <GradeRowsEditor
                    rows={form.rows}
                    onChange={rows => setForm(f => ({ ...f, rows }))}
                />
            </div>


            <div className="pt-2">
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full rounded-none h-9 bg-primary text-primary-foreground hover:bg-primary/80"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            {mode === 'add' ? 'Creating…' : 'Saving…'}
                        </>
                    ) : (
                        mode === 'add'
                            ? 'Create Grading Scale'
                            : 'Save Grading Scale'
                    )}
                </Button>
            </div>
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
            {col1Mode === 'addGradingScale' && (
                <>
                    <ColHeader title="Add Grading Scale" subtitle="" icon={<BarChart3 className="h-5 w-5" />}
                        onBack={() => setCol1Mode('listSyllabi')} />
                    <GradingScaleForm mode="add" onSave={onCreate} isSaving={isCreating} />
                </>
            )}

            {col1Mode === 'editGradingScale' && editingScale && (
                <>
                    <ColHeader title="Edit Grading Scale" subtitle="" icon={<BarChart3 className="h-5 w-5" />}
                        onBack={() => setCol1Mode('listSyllabi')}>
                        <DeleteButton onClick={() => setDeleteConfirmOpen(true)} />
                    </ColHeader>
                    <GradingScaleForm mode="edit" scale={editingScale} onSave={body => onUpdate(editingScale.id, body)} isSaving={isUpdating} />
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
                            if (editingScale) { onDelete(editingScale.id); setCol1Mode('listSyllabi') }
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
