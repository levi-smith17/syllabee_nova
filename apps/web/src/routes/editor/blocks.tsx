import React from 'react'
import { Eye, EyeOff, Loader2, Trash2, Plus, GripVertical, FileText, Copy } from 'lucide-react'
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
    useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { cn } from '@/lib/utils'
import { ColHeader, AddButton, BLOCK_META, BLK_HEADING_OPTS, Col3Mode, uid, newBlockContent } from './shared'
import { ContentLibraryDialog } from './content-library'
import type { MasterSyllabus, SyllabusSegment, SyllabusBlock, BlockType, GradingScale } from '@syllabee/types'

type SegmentWithBlocks = SyllabusSegment & { blocks: SyllabusBlock[] }

// ── Sortable block row ────────────────────────────────────────────────────────

function SortableBlockRow({ block, selected, onSelect, onToggleVisible }: {
    block: SyllabusBlock
    selected: boolean
    onSelect: () => void
    onToggleVisible: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
    const style = { transform: CSS.Transform.toString(transform), transition }
    const { label, Icon } = BLOCK_META[block.type] ?? { label: block.type, Icon: FileText }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-2 px-3 py-2.5 border cursor-pointer hover:bg-muted/40 transition-colors',
                selected ? 'border-primary bg-muted' : 'border-border',
                isDragging && 'opacity-50 z-10',
            )}
            onClick={onSelect}
        >
            <button
                className="p-0.5 cursor-grab text-muted-foreground hover:text-foreground shrink-0 touch-none"
                {...attributes}
                {...listeners}
                onClick={e => e.stopPropagation()}
                title="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{block.name}</p>
                <p className="text-[11px] text-muted-foreground">
                    {label}
                    {!block.isVisible && <span className="ml-1.5 opacity-60">(hidden)</span>}
                </p>
            </div>
            <button
                className="p-1 text-muted-foreground hover:text-foreground rounded-sm hover:bg-muted transition-colors shrink-0"
                onClick={e => { e.stopPropagation(); onToggleVisible() }}
                title={block.isVisible ? 'Hide' : 'Show'}
            >
                {block.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
        </div>
    )
}

// ── Block picker ──────────────────────────────────────────────────────────────

function BlockPicker({ onPick, onCopyFromLibrary }: {
    onPick: (type: BlockType) => void
    onCopyFromLibrary: () => void
}) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
                {(Object.entries(BLOCK_META) as [BlockType, { label: string; Icon: React.ElementType }][]).map(([type, { label, Icon }]) => (
                    <button
                        key={type}
                        onClick={() => onPick(type)}
                        className="flex flex-col items-center gap-2 border p-4 hover:bg-muted/50 hover:border-primary/50 transition-colors text-center"
                    >
                        <Icon className="h-6 w-6 text-primary" />
                        <span className="text-xs font-medium leading-tight">{label}</span>
                    </button>
                ))}
            </div>
            <button
                onClick={onCopyFromLibrary}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-border px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
                <Copy className="h-4 w-4" />Copy from Library
            </button>
        </div>
    )
}

// ── Block form ────────────────────────────────────────────────────────────────

function BlockForm({ mode, block, type, gradingScales, locked, onSave, onDelete, isSaving }: {
    mode: 'add' | 'edit'
    block?: SyllabusBlock
    type: BlockType
    gradingScales: GradingScale[]
    locked?: boolean
    onSave: (body: Record<string, unknown>) => void
    onDelete?: () => void
    isSaving: boolean
}) {
    const { label, Icon } = BLOCK_META[type] ?? { label: type, Icon: FileText }
    const [name, setName] = React.useState(block?.name ?? label)
    const [isVisible, setIsVisible] = React.useState(block?.isVisible ?? true)
    const [printHeading, setPrintHeading] = React.useState(block?.printHeading ?? 3)
    const [content, setContent] = React.useState<Record<string, unknown>>(block?.content ?? newBlockContent(type))

    React.useEffect(() => {
        if (!block) return
        setName(block.name)
        setIsVisible(block.isVisible)
        setPrintHeading(block.printHeading)
        setContent(block.content)
    }, [block?.id])

    return (
        <form
            onSubmit={e => { e.preventDefault(); onSave({ name, isVisible, printHeading, content }) }}
            className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl"
        >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-4 w-4" /><span>{label}</span>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Block Name</Label>
                <Input value={name} disabled={locked} onChange={e => setName(e.target.value)} className="rounded-none h-8 text-xs" required />
            </div>
            <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                    <Switch checked={isVisible} disabled={locked} onCheckedChange={setIsVisible} />
                    <Label className="text-xs cursor-pointer">Visible</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs shrink-0">Print Heading</Label>
                    <Select value={String(printHeading)} disabled={locked} onValueChange={v => setPrintHeading(Number(v))}>
                        <SelectTrigger className="w-20 h-7 text-xs rounded-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {BLK_HEADING_OPTS.map(n => <SelectItem key={n} value={String(n)}>H{n}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="border-t pt-4">
                <BlockContentEditor
                    type={type}
                    content={content}
                    locked={locked ?? false}
                    gradingScales={gradingScales}
                    onChange={setContent}
                />
            </div>
            {!locked && (
                <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={isSaving} className="flex-1 rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                        {isSaving
                            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{mode === 'add' ? 'Creating…' : 'Saving…'}</>
                            : mode === 'add' ? 'Create Block' : 'Save Block'}
                    </Button>
                    {mode === 'edit' && onDelete && (
                        <Button type="button" variant="destructive" size="icon" className="h-9 w-9 rounded-none shrink-0" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}
        </form>
    )
}

// ── Block content editor ──────────────────────────────────────────────────────

function BlockContentEditor({ type, content, locked, gradingScales, onChange }: {
    type: BlockType
    content: Record<string, unknown>
    locked: boolean
    gradingScales: GradingScale[]
    onChange: (c: Record<string, unknown>) => void
}) {
    switch (type) {
        case 'content_block':
            return (
                <div className="space-y-1.5">
                    <Label>Content</Label>
                    <RichTextEditor
                        content={(content.html as string) ?? ''}
                        onChange={(html: string) => { if (!locked) onChange({ ...content, html }) }}
                    />
                </div>
            )

        case 'details_block':
            return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Summary</Label>
                        <Input value={(content.summary as string) ?? ''} disabled={locked}
                            onChange={e => onChange({ ...content, summary: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Content</Label>
                        <RichTextEditor
                            content={(content.html as string) ?? ''}
                            onChange={(html: string) => { if (!locked) onChange({ ...content, html }) }}
                        />
                    </div>
                </div>
            )

        case 'video_block':
            return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Video URL</Label>
                        <Input value={(content.url as string) ?? ''} disabled={locked}
                            onChange={e => onChange({ ...content, url: e.target.value })} placeholder="https://…" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Caption</Label>
                        <Input value={(content.caption as string) ?? ''} disabled={locked}
                            onChange={e => onChange({ ...content, caption: e.target.value })} />
                    </div>
                </div>
            )

        case 'list_block': {
            const items = (content.items as { id: string; text: string }[]) ?? []
            const style = (content.style as string) ?? 'bullet'
            return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Style</Label>
                        <Select value={style} disabled={locked} onValueChange={v => onChange({ ...content, style: v })}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bullet">Bullet</SelectItem>
                                <SelectItem value="numbered">Numbered</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2">
                                <Input value={item.text} disabled={locked}
                                    onChange={e => onChange({ ...content, items: items.map((it, i) => i === idx ? { ...it, text: e.target.value } : it) })} />
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon"
                                        onClick={() => onChange({ ...content, items: items.filter((_, i) => i !== idx) })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {!locked && (
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => onChange({ ...content, items: [...items, { id: uid(), text: '' }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add Item
                            </Button>
                        )}
                    </div>
                </div>
            )
        }

        case 'table_block': {
            const rows = (content.rows as { id: string; cells: { value: string }[] }[]) ?? []
            const colCount = rows[0]?.cells?.length ?? 1
            function updateCell(rIdx: number, cIdx: number, value: string) {
                onChange({ ...content, rows: rows.map((r, ri) => ri === rIdx ? { ...r, cells: r.cells.map((c, ci) => ci === cIdx ? { ...c, value } : c) } : r) })
            }
            return (
                <div className="space-y-3">
                    <div className="overflow-x-auto">
                        <table className="text-sm border-collapse w-full">
                            <tbody>
                                {rows.map((row, rIdx) => (
                                    <tr key={row.id}>
                                        {row.cells.map((cell, cIdx) => (
                                            <td key={cIdx} className="border p-0">
                                                <Input value={cell.value} disabled={locked}
                                                    onChange={e => updateCell(rIdx, cIdx, e.target.value)}
                                                    className="border-0 rounded-none h-8 text-xs" />
                                            </td>
                                        ))}
                                        {!locked && (
                                            <td className="border-0 pl-1">
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                                                    onClick={() => onChange({ ...content, rows: rows.filter((_, i) => i !== rIdx) })}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!locked && (
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => onChange({ ...content, rows: [...rows, { id: uid(), cells: Array.from({ length: colCount }, () => ({ value: '' })) }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add Row
                            </Button>
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => onChange({ ...content, rows: rows.map(r => ({ ...r, cells: [...r.cells, { value: '' }] })) })}>
                                <Plus className="h-4 w-4 mr-1" />Add Column
                            </Button>
                        </div>
                    )}
                </div>
            )
        }

        case 'grade_determination_block': {
            const rows = (content.rows as { id: string; category: string; weight: number; description: string }[]) ?? []
            const gradingScaleId = (content.gradingScaleId as string) ?? ''
            const totalWeight = rows.reduce((s, r) => s + (r.weight ?? 0), 0)
            return (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Grading Scale</Label>
                        <Select value={gradingScaleId} disabled={locked} onValueChange={v => onChange({ ...content, gradingScaleId: v })}>
                            <SelectTrigger><SelectValue placeholder="Select a grading scale…" /></SelectTrigger>
                            <SelectContent>
                                {gradingScales.map(gs => <SelectItem key={gs.id} value={gs.id}>{gs.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Grade Categories</Label>
                        {rows.map((row, idx) => (
                            <div key={row.id} className="grid grid-cols-[1fr_5rem_1fr_auto] gap-2 items-center">
                                <Input value={row.category} placeholder="Category" disabled={locked}
                                    onChange={e => onChange({ ...content, rows: rows.map((r, i) => i === idx ? { ...r, category: e.target.value } : r) })} />
                                <Input type="number" value={row.weight} placeholder="Weight %" disabled={locked}
                                    onChange={e => onChange({ ...content, rows: rows.map((r, i) => i === idx ? { ...r, weight: Number(e.target.value) } : r) })} />
                                <Input value={row.description} placeholder="Description" disabled={locked}
                                    onChange={e => onChange({ ...content, rows: rows.map((r, i) => i === idx ? { ...r, description: e.target.value } : r) })} />
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon"
                                        onClick={() => onChange({ ...content, rows: rows.filter((_, i) => i !== idx) })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <div className="flex items-center gap-4">
                            {!locked && (
                                <Button type="button" variant="outline" size="sm"
                                    onClick={() => onChange({ ...content, rows: [...rows, { id: uid(), category: '', weight: 0, description: '' }] })}>
                                    <Plus className="h-4 w-4 mr-1" />Add Row
                                </Button>
                            )}
                            <span className={`text-sm ${totalWeight === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                Total: {totalWeight}%
                            </span>
                        </div>
                    </div>
                </div>
            )
        }

        case 'response_block': {
            const questions = (content.questions as { id: string; type: 'MCQ' | 'TF'; text: string; points: number; choices: { id: string; text: string; isCorrect: boolean }[] }[]) ?? []
            function updateQuestion(idx: number, updates: object) {
                onChange({ ...content, questions: questions.map((q, i) => i === idx ? { ...q, ...updates } : q) })
            }
            return (
                <div className="space-y-4">
                    {questions.map((q, qIdx) => (
                        <div key={q.id} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">{q.type}</span>
                                <Input className="flex-1 text-sm" value={q.text} placeholder="Question text" disabled={locked}
                                    onChange={e => updateQuestion(qIdx, { text: e.target.value })} />
                                <Input type="number" className="w-16 text-sm" value={q.points} disabled={locked}
                                    onChange={e => updateQuestion(qIdx, { points: Number(e.target.value) })} />
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon"
                                        onClick={() => onChange({ ...content, questions: questions.filter((_, i) => i !== qIdx) })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {q.type === 'MCQ' && (
                                <div className="space-y-1 pl-2">
                                    {q.choices.map((c, cIdx) => (
                                        <div key={c.id} className="flex items-center gap-2">
                                            <Checkbox checked={c.isCorrect} disabled={locked}
                                                onCheckedChange={v => updateQuestion(qIdx, { choices: q.choices.map((ch, i) => i === cIdx ? { ...ch, isCorrect: !!v } : ch) })} />
                                            <Input value={c.text} placeholder="Choice" className="text-sm flex-1" disabled={locked}
                                                onChange={e => updateQuestion(qIdx, { choices: q.choices.map((ch, i) => i === cIdx ? { ...ch, text: e.target.value } : ch) })} />
                                            {!locked && (
                                                <Button type="button" variant="ghost" size="icon"
                                                    onClick={() => updateQuestion(qIdx, { choices: q.choices.filter((_, i) => i !== cIdx) })}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {!locked && (
                                        <Button type="button" variant="ghost" size="sm"
                                            onClick={() => updateQuestion(qIdx, { choices: [...q.choices, { id: uid(), text: '', isCorrect: false }] })}>
                                            <Plus className="h-3.5 w-3.5 mr-1" />Add Choice
                                        </Button>
                                    )}
                                </div>
                            )}
                            {q.type === 'TF' && (
                                <div className="pl-2 flex gap-4">
                                    {(['True', 'False'] as const).map(opt => (
                                        <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                            <input type="radio" name={`tf-${q.id}`} value={opt}
                                                checked={q.choices.find(c => c.text === opt)?.isCorrect ?? false}
                                                disabled={locked}
                                                onChange={() => updateQuestion(qIdx, {
                                                    choices: [
                                                        { id: uid(), text: 'True', isCorrect: opt === 'True' },
                                                        { id: uid(), text: 'False', isCorrect: opt === 'False' },
                                                    ],
                                                })} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {!locked && (
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => onChange({ ...content, questions: [...questions, { id: uid(), type: 'MCQ', text: '', points: 1, choices: [] }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add MCQ
                            </Button>
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => onChange({ ...content, questions: [...questions, { id: uid(), type: 'TF', text: '', points: 1, choices: [{ id: uid(), text: 'True', isCorrect: true }, { id: uid(), text: 'False', isCorrect: false }] }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add T/F
                            </Button>
                        </div>
                    )}
                </div>
            )
        }

        case 'schedule_block': {
            const units = (content.units as { id: string; weekNum: number; date: string; label: string; topics: { id: string; topic: string; reading: string; assignment: string; category: string; points: number; dueDate: string }[] }[]) ?? []
            function updateUnit(uIdx: number, updates: object) {
                onChange({ ...content, units: units.map((u, i) => i === uIdx ? { ...u, ...updates } : u) })
            }
            function updateTopic(uIdx: number, tIdx: number, updates: object) {
                updateUnit(uIdx, { topics: units[uIdx].topics.map((t, i) => i === tIdx ? { ...t, ...updates } : t) })
            }
            return (
                <div className="space-y-4">
                    {units.map((unit, uIdx) => (
                        <div key={unit.id} className="border rounded-md p-3 space-y-3">
                            <div className="grid grid-cols-[5rem_1fr_1fr_auto] gap-2 items-center">
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Week</Label>
                                    <Input type="number" value={unit.weekNum} disabled={locked}
                                        onChange={e => updateUnit(uIdx, { weekNum: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Date</Label>
                                    <Input type="date" value={unit.date} disabled={locked}
                                        onChange={e => updateUnit(uIdx, { date: e.target.value })} />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Label</Label>
                                    <Input value={unit.label} placeholder="Week label" disabled={locked}
                                        onChange={e => updateUnit(uIdx, { label: e.target.value })} />
                                </div>
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon" className="self-end"
                                        onClick={() => onChange({ ...content, units: units.filter((_, i) => i !== uIdx) })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <div className="pl-2 space-y-2">
                                {unit.topics.map((topic, tIdx) => (
                                    <div key={topic.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_5rem_1fr_auto] gap-1 text-xs items-center">
                                        {(['topic', 'reading', 'assignment', 'category'] as const).map(field => (
                                            <Input key={field} value={topic[field]} placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                                disabled={locked} className="h-7 text-xs"
                                                onChange={e => updateTopic(uIdx, tIdx, { [field]: e.target.value })} />
                                        ))}
                                        <Input type="number" value={topic.points} placeholder="Pts" disabled={locked} className="h-7 text-xs"
                                            onChange={e => updateTopic(uIdx, tIdx, { points: Number(e.target.value) })} />
                                        <Input type="date" value={topic.dueDate} disabled={locked} className="h-7 text-xs"
                                            onChange={e => updateTopic(uIdx, tIdx, { dueDate: e.target.value })} />
                                        {!locked && (
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                                onClick={() => updateUnit(uIdx, { topics: unit.topics.filter((_, i) => i !== tIdx) })}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {!locked && (
                                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                                        onClick={() => updateUnit(uIdx, { topics: [...unit.topics, { id: uid(), topic: '', reading: '', assignment: '', category: '', points: 0, dueDate: '' }] })}>
                                        <Plus className="h-3.5 w-3.5 mr-1" />Add Topic
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {!locked && (
                        <Button type="button" variant="outline" size="sm"
                            onClick={() => onChange({ ...content, units: [...units, { id: uid(), weekNum: units.length + 1, date: '', label: '', topics: [] }] })}>
                            <Plus className="h-4 w-4 mr-1" />Add Week
                        </Button>
                    )}
                </div>
            )
        }

        case 'file_block': {
            const attachments = (content.attachments as { id: string; name: string; url: string; description?: string }[]) ?? []
            return (
                <div className="space-y-3">
                    {attachments.map((att, idx) => (
                        <div key={att.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                            <Input value={att.name} placeholder="File name" disabled={locked}
                                onChange={e => onChange({ ...content, attachments: attachments.map((a, i) => i === idx ? { ...a, name: e.target.value } : a) })} />
                            <Input value={att.url} placeholder="URL" disabled={locked}
                                onChange={e => onChange({ ...content, attachments: attachments.map((a, i) => i === idx ? { ...a, url: e.target.value } : a) })} />
                            <Input value={att.description ?? ''} placeholder="Description" disabled={locked}
                                onChange={e => onChange({ ...content, attachments: attachments.map((a, i) => i === idx ? { ...a, description: e.target.value } : a) })} />
                            {!locked && (
                                <Button type="button" variant="ghost" size="icon"
                                    onClick={() => onChange({ ...content, attachments: attachments.filter((_, i) => i !== idx) })}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {!locked && (
                        <Button type="button" variant="outline" size="sm"
                            onClick={() => onChange({ ...content, attachments: [...attachments, { id: uid(), name: '', url: '', description: '' }] })}>
                            <Plus className="h-4 w-4 mr-1" />Add Attachment
                        </Button>
                    )}
                </div>
            )
        }

        default:
            return <p className="text-sm text-muted-foreground">No editor for this block type.</p>
    }
}

// ── Column 3: Block Management ────────────────────────────────────────────────

export function BlockColumn({
    selectedSegment, locked,
    col3Mode, setCol3Mode,
    selectedBlockId, setSelectedBlockId,
    newBlockType, setNewBlockType,
    gradingScales,
    onAddBlock, onUpdateBlock, onDeleteBlock, onToggleBlockVisible, onReorderBlocks,
    isAdding, isUpdating,
    mobileBack,
    syllabi,
    onCopyBlock,
    isCopyingBlock,
}: {
    selectedSegment: SegmentWithBlocks
    locked: boolean
    col3Mode: Col3Mode
    setCol3Mode: (m: Col3Mode) => void
    selectedBlockId: string | null
    setSelectedBlockId: (id: string | null) => void
    newBlockType: BlockType | null
    setNewBlockType: (t: BlockType | null) => void
    gradingScales: GradingScale[]
    onAddBlock: (segId: string, body: Record<string, unknown>) => void
    onUpdateBlock: (segId: string, blockId: string, body: Record<string, unknown>) => void
    onDeleteBlock: (segId: string, blockId: string) => void
    onToggleBlockVisible: (segId: string, blockId: string, current: boolean) => void
    onReorderBlocks: (segId: string, orderedIds: string[]) => void
    isAdding: boolean
    isUpdating: boolean
    mobileBack?: () => void
    syllabi: MasterSyllabus[]
    onCopyBlock: (sourceSyllabusId: string, sourceSegmentId: string, sourceBlockId: string) => void
    isCopyingBlock: boolean
}) {
    const [libraryOpen, setLibraryOpen] = React.useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const sortedBlocks = [...selectedSegment.blocks].sort((a, b) => a.sortOrder - b.sortOrder)
    const selectedBlock = selectedSegment.blocks.find(b => b.id === selectedBlockId)

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIdx = sortedBlocks.findIndex(b => b.id === active.id)
        const newIdx = sortedBlocks.findIndex(b => b.id === over.id)
        onReorderBlocks(selectedSegment.id, arrayMove(sortedBlocks, oldIdx, newIdx).map(b => b.id))
    }

    return (
        <div className="w-full md:flex-1 flex flex-col overflow-hidden min-w-0">

            {col3Mode === 'blocks' && (
                <>
                    <ColHeader title={selectedSegment.name} subtitle="Block(s)" onBack={mobileBack}>
                        {!locked && (
                            <AddButton onClick={() => setCol3Mode('picker')} />
                        )}
                    </ColHeader>
                    <div className="flex-1 overflow-y-auto p-3">
                        {sortedBlocks.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No blocks yet.</p>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={sortedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-2">
                                        {sortedBlocks.map(block => (
                                            <SortableBlockRow
                                                key={block.id}
                                                block={block}
                                                selected={selectedBlockId === block.id}
                                                onSelect={() => { setSelectedBlockId(block.id); setCol3Mode('editBlock') }}
                                                onToggleVisible={() => {
                                                    if (!locked) onToggleBlockVisible(selectedSegment.id, block.id, block.isVisible)
                                                }}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </>
            )}

            {col3Mode === 'picker' && (
                <>
                    <ColHeader title="Choose Block Type" subtitle="" onBack={() => setCol3Mode('blocks')} />
                    <BlockPicker
                        onPick={type => { setNewBlockType(type); setCol3Mode('addBlock') }}
                        onCopyFromLibrary={() => setLibraryOpen(true)}
                    />
                </>
            )}

            {col3Mode === 'addBlock' && newBlockType && (
                <>
                    <ColHeader
                        title={`Add ${BLOCK_META[newBlockType]?.label ?? ''} Block`}
                        subtitle=""
                        onBack={() => setCol3Mode('picker')}
                    />
                    <BlockForm
                        mode="add"
                        type={newBlockType}
                        gradingScales={gradingScales}
                        onSave={body => onAddBlock(selectedSegment.id, { ...body, type: newBlockType, content: newBlockContent(newBlockType) })}
                        isSaving={isAdding}
                    />
                </>
            )}

            {col3Mode === 'editBlock' && (
                <>
                    <ColHeader
                        title="Edit Block"
                        subtitle=""
                        onBack={() => { setSelectedBlockId(null); setCol3Mode('blocks') }}
                    />
                    {selectedBlock ? (
                        <BlockForm
                            mode="edit"
                            block={selectedBlock}
                            type={selectedBlock.type}
                            gradingScales={gradingScales}
                            locked={locked}
                            onSave={body => onUpdateBlock(selectedSegment.id, selectedBlock.id, body)}
                            onDelete={() => onDeleteBlock(selectedSegment.id, selectedBlock.id)}
                            isSaving={isUpdating}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
            )}

            <ContentLibraryDialog
                mode="block"
                open={libraryOpen}
                onClose={() => setLibraryOpen(false)}
                syllabi={syllabi}
                onCopyBlock={(sourceSyllabusId, sourceSegmentId, sourceBlockId) => {
                    onCopyBlock(sourceSyllabusId, sourceSegmentId, sourceBlockId)
                    setLibraryOpen(false)
                    setCol3Mode('blocks')
                }}
                isCopying={isCopyingBlock}
            />

        </div>
    )
}
