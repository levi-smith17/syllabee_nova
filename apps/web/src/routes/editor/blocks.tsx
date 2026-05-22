import React from 'react'
import { Loader2, Trash2, Plus, GripVertical, FileText, Copy, Pencil, MoreHorizontal, Heading3, Heading4, Heading5, Heading6, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
    useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ColHeader, AddButton, BLOCK_META, BLK_HEADING_OPTS, Col3Mode, uid, newBlockContent } from './shared'
import { ContentLibraryDialog } from './content-library'
import type { MasterSyllabus, SyllabusSegment, SyllabusBlock, BlockType, GradingScale } from '@syllabee/types'

type SegmentWithBlocks = SyllabusSegment & { blocks: SyllabusBlock[] }

const BLOCK_HEADING_ICONS: Record<number, React.ElementType> = {
    3: Heading3, 4: Heading4, 5: Heading5, 6: Heading6,
}

const BLOCK_HEADING_DESCS: Record<number, string> = {
    3: 'Top-level block — a major content heading within a segment.',
    4: 'Sub-heading — indented one level under an H3 block.',
    5: 'Nested sub-heading — indented two levels under an H3 block.',
    6: 'Deepest heading — indented three levels under an H3 block.',
}

// ── Sortable block row ────────────────────────────────────────────────────────

function SortableBlockRow({ block, selected, onEdit, onDelete, draggingHeading }: {
    block: SyllabusBlock
    selected: boolean
    onEdit: () => void
    onDelete: () => void
    draggingHeading: number | null
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
    const { Icon } = BLOCK_META[block.type] ?? { label: block.type, Icon: FileText }

    // Clamp to valid block heading range (H3–H6) regardless of stored value
    const storedHeading = Math.max(3, Math.min(6, block.printHeading))
    const headingLevel = isDragging && draggingHeading != null ? draggingHeading : storedHeading
    const HeadingIcon = BLOCK_HEADING_ICONS[headingLevel] ?? Heading3
    const snappedTransform = isDragging && draggingHeading != null && transform
        ? { ...transform, x: (draggingHeading - storedHeading) * 16 }
        : transform
    const style = {
        transform: CSS.Transform.toString(snappedTransform),
        transition,
        marginLeft: `${(storedHeading - 3) * 16}px`,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-stretch border transition-colors',
                selected ? 'border-primary bg-muted' : 'border-border',
                isDragging && 'opacity-50 z-10',
            )}
        >
            {/* Left action bar */}
            <div className="flex flex-col items-center bg-primary gap-1 py-2 px-1.5 shrink-0">
                <button
                    className="p-1.5 cursor-grab text-black hover:bg-black/10 rounded-sm touch-none shrink-0"
                    {...attributes}
                    {...listeners}
                    title="Drag to reorder; move left/right to change heading level"
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <Icon className="h-4 w-4 text-black my-0.5 shrink-0" />
                <HeadingIcon className="h-4 w-4 text-black my-0.5 shrink-0" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1.5 text-black bg-black/10 hover:bg-black/20 rounded-sm transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right">
                        <DropdownMenuItem onClick={onEdit}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-red-500 focus:text-red-600 focus:bg-red-500/10"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content area — not clickable; use ⋯ → Edit to open the form */}
            <div className="flex-1 min-w-0 px-3 py-2.5">
                <p className="text-xs font-semibold mb-1.5">{block.name}</p>
                <BlockContentPreview type={block.type} content={block.content} />
            </div>
        </div>
    )
}

// ── Block content preview (read-only) ────────────────────────────────────────

function BlockContentPreview({ type, content }: {
    type: BlockType
    content: Record<string, unknown>
}) {
    switch (type) {
        case 'content_block':
            return (content.html as string)
                ? <div className="prose prose-sm max-w-none text-xs [&_*]:text-xs" dangerouslySetInnerHTML={{ __html: content.html as string }} />
                : <p className="text-xs text-muted-foreground italic">No content.</p>

        case 'details_block': {
            type Section = { id: string; html: string }
            const sections = content.sections as Section[] | undefined
            const legacyHtml = content.html as string | undefined
            const hasContent = sections ? sections.some(s => s.html) : !!legacyHtml
            return (
                <div className="space-y-1">
                    {(content.summary as string) && <p className="text-xs font-medium">{content.summary as string}</p>}
                    {sections ? (
                        hasContent
                            ? sections.filter(s => s.html).map((s, i) => (
                                <div key={i} className="prose prose-sm max-w-none text-xs [&_*]:text-xs" dangerouslySetInnerHTML={{ __html: s.html }} />
                            ))
                            : <p className="text-xs text-muted-foreground italic">No content.</p>
                    ) : legacyHtml ? (
                        <div className="prose prose-sm max-w-none text-xs [&_*]:text-xs" dangerouslySetInnerHTML={{ __html: legacyHtml }} />
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No content.</p>
                    )}
                </div>
            )
        }

        case 'video_block':
            return (
                <div className="space-y-0.5">
                    {(content.url as string)
                        ? <p className="text-xs text-primary truncate">{content.url as string}</p>
                        : <p className="text-xs text-muted-foreground italic">No URL.</p>}
                    {(content.caption as string) && <p className="text-xs text-muted-foreground">{content.caption as string}</p>}
                </div>
            )

        case 'list_block': {
            type PItem = { id: string; text: string; level?: number }
            const items = (content.items as PItem[]) ?? []
            if (items.length === 0) return <p className="text-xs text-muted-foreground italic">No items.</p>
            const isNew = !!content.levelStyles
            const levelStyles = (content.levelStyles as Record<string, string>) ?? {}
            const legacyStyle = (content.style as string) ?? 'bullet'
            if (isNew) {
                return (
                    <ul className="pl-3 space-y-0.5">
                        {items.map(it => (
                            <li key={it.id} className="text-xs" style={{ listStyleType: levelStyles[String(it.level ?? 1)] ?? 'disc', marginLeft: `${((it.level ?? 1) - 1) * 12}px` }}>
                                {it.text}
                            </li>
                        ))}
                    </ul>
                )
            }
            return legacyStyle === 'numbered'
                ? <ol className="list-decimal list-inside space-y-0.5">{items.map(it => <li key={it.id} className="text-xs">{it.text}</li>)}</ol>
                : <ul className="list-disc list-inside space-y-0.5">{items.map(it => <li key={it.id} className="text-xs">{it.text}</li>)}</ul>
        }

        case 'table_block': {
            const rows = (content.rows as { id: string; cells: { value: string }[] }[]) ?? []
            if (rows.length === 0) return <p className="text-xs text-muted-foreground italic">No rows.</p>
            return (
                <div className="overflow-x-auto">
                    <table className="text-xs border-collapse w-full">
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.id}>
                                    {row.cells.map((cell, ci) => (
                                        <td key={ci} className="border border-border px-2 py-0.5">{cell.value}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }

        case 'grade_determination_block': {
            const rows = (content.rows as { id: string; category: string; weight: number }[]) ?? []
            if (rows.length === 0) return <p className="text-xs text-muted-foreground italic">No categories.</p>
            return (
                <div className="space-y-0.5">
                    {rows.map(row => (
                        <div key={row.id} className="flex items-center gap-2 text-xs">
                            <span className="flex-1 truncate">{row.category}</span>
                            <span className="text-muted-foreground shrink-0">{row.weight}%</span>
                        </div>
                    ))}
                </div>
            )
        }

        case 'response_block': {
            const questions = (content.questions as { id: string; type: string; text: string; points: number }[]) ?? []
            if (questions.length === 0) return <p className="text-xs text-muted-foreground italic">No questions.</p>
            return (
                <div className="space-y-1">
                    {questions.map((q, i) => (
                        <p key={q.id} className="text-xs">
                            <span className="text-muted-foreground mr-1">{i + 1}.</span>
                            {q.text || <em className="text-muted-foreground">Untitled</em>}
                            <span className="text-muted-foreground ml-1.5">({q.type}, {q.points}pt{q.points !== 1 ? 's' : ''})</span>
                        </p>
                    ))}
                </div>
            )
        }

        case 'schedule_block': {
            const units = (content.units as { id: string; weekNum: number; label: string; topics: unknown[] }[]) ?? []
            if (units.length === 0) return <p className="text-xs text-muted-foreground italic">No weeks.</p>
            return (
                <div className="space-y-0.5">
                    {units.map(unit => (
                        <p key={unit.id} className="text-xs">
                            <span className="font-medium">Week {unit.weekNum}</span>
                            {unit.label && <span className="text-muted-foreground ml-1.5">— {unit.label}</span>}
                            {unit.topics.length > 0 && (
                                <span className="text-muted-foreground ml-1.5">({unit.topics.length} topic{unit.topics.length !== 1 ? 's' : ''})</span>
                            )}
                        </p>
                    ))}
                </div>
            )
        }

        case 'file_block': {
            const attachments = (content.attachments as { id: string; name: string }[]) ?? []
            if (attachments.length === 0) return <p className="text-xs text-muted-foreground italic">No attachments.</p>
            return (
                <div className="space-y-0.5">
                    {attachments.map(att => (
                        <p key={att.id} className="text-xs">{att.name || <em className="text-muted-foreground">Unnamed file</em>}</p>
                    ))}
                </div>
            )
        }

        default:
            return null
    }
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

function BlockForm({ mode, block, type, gradingScales, locked, existingPrintGroups, onSave, onDelete, isSaving }: {
    mode: 'add' | 'edit'
    block?: SyllabusBlock
    type: BlockType
    gradingScales: GradingScale[]
    locked?: boolean
    existingPrintGroups: string[]
    onSave: (body: Record<string, unknown>) => void
    onDelete?: () => void
    isSaving: boolean
}) {
    const { label, Icon } = BLOCK_META[type] ?? { label: type, Icon: FileText }
    const [name, setName] = React.useState(block?.name ?? label)
    const [printHeading, setPrintHeading] = React.useState(block?.printHeading ?? 3)
    const [printGroup, setPrintGroup] = React.useState(block?.printGroup ?? '')
    const [content, setContent] = React.useState<Record<string, unknown>>(block?.content ?? newBlockContent(type))

    React.useEffect(() => {
        if (!block) return
        setName(block.name)
        setPrintHeading(block.printHeading)
        setPrintGroup(block.printGroup ?? '')
        setContent(block.content)
    }, [block?.id])

    return (
        <form
            onSubmit={e => { e.preventDefault(); onSave({ name, printHeading, ...(printGroup ? { printGroup } : {}), content }) }}
            className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl"
        >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-4 w-4" /><span>{label}</span>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs">Block Name</Label>
                <Input placeholder={name} value={mode !== 'add' ? name : undefined} disabled={locked} onChange={e => setName(e.target.value)} className="rounded-none h-8 text-xs" required />
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Print Group</Label>
                <Input
                    placeholder="e.g. Intro"
                    value={printGroup}
                    disabled={locked}
                    onChange={e => setPrintGroup(e.target.value)}
                    className="rounded-none h-8 text-xs"
                    list="print-group-datalist"
                    autoComplete="off"
                />
                {existingPrintGroups.length > 0 && (
                    <datalist id="print-group-datalist">
                        {existingPrintGroups.map(pg => <option key={pg} value={pg} />)}
                    </datalist>
                )}
                <p className="text-[11px] text-muted-foreground leading-snug">
                    The print group that this block is assigned to. Print groups are used to merge content together during printing (it combines separate blocks into a single block during printing).
                </p>
            </div>

            {/* Print Heading Level — choice cards */}
            <div className="space-y-1.5">
                <Label className="text-xs">Print Heading Level</Label>
                <div className="flex flex-col gap-1.5">
                    {BLK_HEADING_OPTS.map(h => {
                        const checked = printHeading === h
                        return (
                            <label
                                key={h}
                                className={cn(
                                    'flex items-start gap-2.5 border p-3 cursor-pointer transition-colors',
                                    locked && 'pointer-events-none opacity-60',
                                    checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="printHeading"
                                    checked={checked}
                                    onChange={() => setPrintHeading(h)}
                                    disabled={locked}
                                    className="sr-only"
                                />
                                <div className={cn(
                                    'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center',
                                    checked ? 'border-primary' : 'border-muted-foreground/40',
                                )}>
                                    {checked && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                </div>
                                <div className="flex items-start gap-2">
                                    <div>
                                        <p className="text-xs font-medium mb-0.5">H{h}</p>
                                        <p className="text-[11px] text-muted-foreground leading-snug">{BLOCK_HEADING_DESCS[h]}</p>
                                    </div>
                                </div>
                            </label>
                        )
                    })}
                </div>
            </div>

            <div className="pt-2">
                <BlockContentEditor
                    type={type}
                    content={content}
                    locked={locked ?? false}
                    gradingScales={gradingScales}
                    onChange={setContent}
                />
            </div>
            {!locked && (
                <div className="space-y-2 pt-2">
                    <Button type="submit" disabled={isSaving} className="w-full rounded-none h-9 bg-primary text-black hover:bg-primary/80">
                        {isSaving
                            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{mode === 'add' ? 'Creating…' : 'Saving…'}</>
                            : mode === 'add' ? 'Create Block' : 'Save Block'}
                    </Button>
                    {mode !== 'add' && onDelete && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={onDelete}
                            className="w-full rounded-none h-9 text-xs"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Block
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
                        className="rounded-none"
                    />
                </div>
            )

        case 'details_block': {
            type Section = { id: string; html: string }
            const sections: Section[] = (content.sections as Section[]) ?? []
            return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Summary</Label>
                        <Input value={(content.summary as string) ?? ''} disabled={locked} className="rounded-none"
                            onChange={e => onChange({ ...content, summary: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label>Content</Label>
                        {sections.map((sec, idx) => (
                            <div key={sec.id} className="space-y-1">
                                {sections.length > 1 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Section {idx + 1}</span>
                                        {!locked && (
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                                                onClick={() => onChange({ ...content, sections: sections.filter((_, i) => i !== idx) })}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                                <RichTextEditor
                                    key={sec.id}
                                    content={sec.html}
                                    onChange={(html: string) => {
                                        if (!locked) onChange({ ...content, sections: sections.map((s, i) => i === idx ? { ...s, html } : s) })
                                    }}
                                    className="rounded-none"
                                />
                            </div>
                        ))}
                        {sections.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">No content areas. Add one below.</p>
                        )}
                        {!locked && (
                            <Button type="button" variant="outline" size="sm" className="rounded-none"
                                onClick={() => onChange({ ...content, sections: [...sections, { id: uid(), html: '' }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add Content Area
                            </Button>
                        )}
                    </div>
                </div>
            )
        }

        case 'video_block':
            return (
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Video URL</Label>
                        <Input value={(content.url as string) ?? ''} disabled={locked} className="rounded-none"
                            onChange={e => onChange({ ...content, url: e.target.value })} placeholder="https://…" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Caption</Label>
                        <Input value={(content.caption as string) ?? ''} disabled={locked} className="rounded-none"
                            onChange={e => onChange({ ...content, caption: e.target.value })} />
                    </div>
                </div>
            )

        case 'list_block': {
            type LItem = { id: string; text: string; level: number }
            const defaultStyles: Record<string, string> = { '1': 'disc', '2': 'circle', '3': 'square', '4': 'disc', '5': 'circle' }
            const levelStyles = (content.levelStyles as Record<string, string>) ?? defaultStyles
            const items: LItem[] = ((content.items as { id: string; text: string; level?: number }[]) ?? [])
                .map(it => ({ ...it, level: it.level ?? 1 }))

            function updateStyles(s: Record<string, string>) {
                onChange({ ...content, levelStyles: s, items })
            }
            function updateItems(newItems: LItem[]) {
                onChange({ ...content, levelStyles, items: newItems })
            }

            const styleOptionsSx = 'text-xs h-7'
            return (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Level Styles</Label>
                        <div className="space-y-1.5">
                            {([1, 2, 3, 4, 5] as const).map(lvl => (
                                <div key={lvl} className="flex items-center gap-2" style={{ paddingLeft: `${(lvl - 1) * 14}px` }}>
                                    <span className="text-xs text-muted-foreground w-14 shrink-0">Level {lvl}</span>
                                    <Select
                                        value={levelStyles[String(lvl)] ?? 'disc'}
                                        disabled={locked}
                                        onValueChange={v => updateStyles({ ...levelStyles, [String(lvl)]: v })}
                                    >
                                        <SelectTrigger className={`flex-1 ${styleOptionsSx}`}><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Bulleted</SelectLabel>
                                                <SelectItem value="disc">Disc (●)</SelectItem>
                                                <SelectItem value="circle">Circle (○)</SelectItem>
                                                <SelectItem value="square">Square (■)</SelectItem>
                                            </SelectGroup>
                                            <SelectSeparator />
                                            <SelectGroup>
                                                <SelectLabel>Numbered</SelectLabel>
                                                <SelectItem value="decimal">Decimal (1, 2, 3…)</SelectItem>
                                                <SelectItem value="decimal-leading-zero">Decimal leading zero (01, 02…)</SelectItem>
                                                <SelectItem value="upper-roman">Upper Roman (I, II, III…)</SelectItem>
                                                <SelectItem value="lower-roman">Lower Roman (i, ii, iii…)</SelectItem>
                                                <SelectItem value="upper-alpha">Upper Alpha (A, B, C…)</SelectItem>
                                                <SelectItem value="lower-alpha">Lower Alpha (a, b, c…)</SelectItem>
                                                <SelectItem value="upper-greek">Upper Greek (Α, Β, Γ…)</SelectItem>
                                                <SelectItem value="lower-greek">Lower Greek (α, β, γ…)</SelectItem>
                                                <SelectItem value="none">None</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Items</Label>
                        {items.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-1" style={{ paddingLeft: `${(item.level - 1) * 16}px` }}>
                                <button
                                    type="button"
                                    disabled={locked || item.level <= 1}
                                    title="Decrease indent"
                                    onClick={() => updateItems(items.map((it, i) => i === idx ? { ...it, level: Math.max(1, it.level - 1) } : it))}
                                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    disabled={locked || item.level >= 5}
                                    title="Increase indent"
                                    onClick={() => updateItems(items.map((it, i) => i === idx ? { ...it, level: Math.min(5, it.level + 1) } : it))}
                                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 shrink-0"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                                <Input
                                    value={item.text}
                                    disabled={locked}
                                    placeholder="Item text"
                                    className="flex-1 h-7 text-xs rounded-none"
                                    onChange={e => updateItems(items.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))}
                                />
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                                        onClick={() => updateItems(items.filter((_, i) => i !== idx))}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {!locked && (
                            <Button type="button" variant="outline" size="sm" className="rounded-none"
                                onClick={() => updateItems([...items, { id: uid(), text: '', level: items.length > 0 ? items[items.length - 1].level : 1 }])}>
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
                        <div key={q.id} className="border p-3 space-y-2">
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
                        <div key={unit.id} className="border p-3 space-y-3">
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
    onAddBlock, onUpdateBlock, onDeleteBlock, onReorderBlocks,
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
    onReorderBlocks: (segId: string, orderedIds: string[]) => void
    isAdding: boolean
    isUpdating: boolean
    mobileBack?: () => void
    syllabi: MasterSyllabus[]
    onCopyBlock: (sourceSyllabusId: string, sourceSegmentId: string, sourceBlockId: string) => void
    isCopyingBlock: boolean
}) {
    const [libraryOpen, setLibraryOpen] = React.useState(false)
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [draggingHeading, setDraggingHeading] = React.useState<number | null>(null)
    const [optimisticHeadings, setOptimisticHeadings] = React.useState<Record<string, number>>({})
    const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
    const draggingHeadingRef = React.useRef<number | null>(null)
    const dragStartHeadingRef = React.useRef<number>(3)
    const listRef = React.useRef<HTMLDivElement>(null)
    const deleteConfirmBlock = selectedSegment.blocks.find(b => b.id === deleteConfirmId)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const sortedBlocks = [...selectedSegment.blocks].sort((a, b) => a.sortOrder - b.sortOrder)
    const selectedBlock = selectedSegment.blocks.find(b => b.id === selectedBlockId)
    const existingPrintGroups = [...new Set(
        selectedSegment.blocks.map(b => b.printGroup).filter((pg): pg is string => !!pg && pg.length > 0)
    )]

    React.useEffect(() => {
        setOptimisticHeadings(prev => {
            const next = { ...prev }
            let changed = false
            for (const block of selectedSegment.blocks) {
                if (next[block.id] !== undefined && next[block.id] === block.printHeading) {
                    delete next[block.id]; changed = true
                }
            }
            return changed ? next : prev
        })
    }, [selectedSegment.blocks])

    React.useEffect(() => {
        if (!activeId) return
        function onPointerMove(e: PointerEvent) {
            if (!listRef.current) return
            const rect = listRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left - 12
            const heading = Math.min(6, Math.max(3, Math.round(x / 16) + 3))
            draggingHeadingRef.current = heading
            setDraggingHeading(heading)
        }
        document.addEventListener('pointermove', onPointerMove)
        return () => document.removeEventListener('pointermove', onPointerMove)
    }, [activeId])

    function handleDragStart(event: DragStartEvent) {
        const block = sortedBlocks.find(b => b.id === event.active.id)
        if (block) {
            setActiveId(String(event.active.id))
            dragStartHeadingRef.current = block.printHeading
            draggingHeadingRef.current = block.printHeading
            setDraggingHeading(block.printHeading)
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const finalHeading = draggingHeadingRef.current
        const headingChanged = finalHeading !== null && finalHeading !== dragStartHeadingRef.current
        const blockId = activeId
        setActiveId(null); setDraggingHeading(null); draggingHeadingRef.current = null

        if (headingChanged && blockId && finalHeading !== null) {
            setOptimisticHeadings(prev => ({ ...prev, [blockId]: finalHeading }))
            onUpdateBlock(selectedSegment.id, blockId, { printHeading: finalHeading })
        }

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
                    <ColHeader title={selectedSegment.name} subtitle={`${selectedSegment.blocks.length} block${selectedSegment.blocks.length !== 1 ? 's' : ''}`} onBack={mobileBack}>
                        {!locked && (
                            <AddButton onClick={() => setCol3Mode('picker')} />
                        )}
                    </ColHeader>
                    <div ref={listRef} className="relative flex-1 overflow-y-auto p-3">
                        {activeId && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {[3, 4, 5, 6].map(h => (
                                    <div
                                        key={h}
                                        className={cn(
                                            'absolute top-0 bottom-0 w-0 border-l border-dashed',
                                            draggingHeading === h ? 'border-primary' : 'border-foreground/30',
                                        )}
                                        style={{ left: `${12 + (h - 3) * 16}px` }}
                                    />
                                ))}
                            </div>
                        )}
                        {sortedBlocks.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No blocks yet.</p>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                                <SortableContext items={sortedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-2">
                                        {sortedBlocks.map(block => (
                                            <SortableBlockRow
                                                key={block.id}
                                                block={optimisticHeadings[block.id] !== undefined
                                                    ? { ...block, printHeading: optimisticHeadings[block.id] }
                                                    : block}
                                                selected={selectedBlockId === block.id}
                                                draggingHeading={activeId === block.id ? draggingHeading : null}
                                                onEdit={() => { setSelectedBlockId(block.id); setCol3Mode('editBlock') }}
                                                onDelete={() => setDeleteConfirmId(block.id)}
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
                        existingPrintGroups={existingPrintGroups}
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
                            existingPrintGroups={existingPrintGroups}
                            onSave={body => onUpdateBlock(selectedSegment.id, selectedBlock.id, body)}
                            onDelete={() => { setDeleteConfirmId(selectedBlock.id); setCol3Mode('blocks') }}
                            isSaving={isUpdating}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </>
            )}

            {col3Mode === 'studentProgress' && (
                <>
                    <ColHeader
                        title="Student Progress"
                        subtitle=""
                        onBack={() => setCol3Mode('blocks')}
                        icon={<Users className="h-4 w-4" />}
                    />
                    <div className="flex-1 flex items-center justify-center p-8">
                        <p className="text-xs text-muted-foreground text-center">Student progress tracking coming soon.</p>
                    </div>
                </>
            )}

            <Dialog open={!!deleteConfirmId} onOpenChange={v => !v && setDeleteConfirmId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Block</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{deleteConfirmBlock?.name ?? 'this block'}</strong>. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onDeleteBlock(selectedSegment.id, deleteConfirmId!)
                                if (selectedBlockId === deleteConfirmId) {
                                    setSelectedBlockId(null)
                                    setCol3Mode('blocks')
                                }
                                setDeleteConfirmId(null)
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ContentLibraryDialog
                mode="block"
                open={libraryOpen}
                onClose={() => { setLibraryOpen(false); setCol3Mode('blocks') }}
                syllabi={syllabi}
                onCopyBlock={(sourceSyllabusId, sourceSegmentId, sourceBlockId) => {
                    onCopyBlock(sourceSyllabusId, sourceSegmentId, sourceBlockId)
                }}
                isCopying={isCopyingBlock}
            />

        </div>
    )
}
