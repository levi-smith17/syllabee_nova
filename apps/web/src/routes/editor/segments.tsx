import React from 'react'
import {
    Binoculars,
    Pencil,
    Eye,
    EyeOff,
    Loader2,
    GripVertical,
    Trash2,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    Plus,
    Copy,
    MoreHorizontal,
    ChartBar,
    Check,
    ExternalLink,
    NotebookTabs
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ColHeader, DeleteButton, Col2Mode, SEG_HEADING_OPTS } from './shared'
import { SectionMultiSelect, sectionLabel } from './section-multi-select'
import { ContentLibraryDialog } from './content-library'
import type { MasterSyllabus, SyllabusSegment, SyllabusBlock, EditorSection } from '@syllabee/types'
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

type SegmentWithBlocks = SyllabusSegment & { blocks: SyllabusBlock[] }

const HEADING_ICONS: Record<number, React.ElementType> = {
    2: Heading2, 3: Heading3, 4: Heading4, 5: Heading5, 6: Heading6,
}

const HEADING_DESCS: Record<number, string> = {
    2: 'Top-level segment — a major section heading in the printed syllabus.',
    3: 'Sub-section — indented one level under an H2 segment.',
    4: 'Nested sub-section — indented two levels under an H2 segment.',
    5: 'Deeper nesting — three levels under an H2 segment.',
    6: 'Deepest level — four levels under an H2 segment.',
}

// ── Sortable segment row ──────────────────────────────────────────────────────

function SortableSegmentRow({ segment, selected, onSelect, onEdit, onDelete, onToggleVisible, onOpenStudentProgress, draggingHeading, allSections, syllabus }: {
    segment: SegmentWithBlocks
    selected: boolean
    onSelect: () => void
    onEdit: () => void
    onDelete: () => void
    onToggleVisible: () => void
    onOpenStudentProgress: () => void
    draggingHeading: number | null
    allSections: EditorSection[]
    syllabus?: MasterSyllabus
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: segment.id })
    const [copiedSectionId, setCopiedSectionId] = React.useState<string | null>(null)

    const headingLevel = isDragging && draggingHeading != null ? draggingHeading : segment.printHeading
    const HeadingIcon = HEADING_ICONS[headingLevel] ?? Heading2

    const snappedTransform = isDragging && draggingHeading != null && transform
        ? { ...transform, x: (draggingHeading - segment.printHeading) * 16 }
        : transform

    const style = {
        transform: CSS.Transform.toString(snappedTransform),
        transition,
        marginLeft: `${(segment.printHeading - 2) * 16}px`,
    }

    const hasSections = (segment.sections ?? []).length > 0
    const linkedSections = (segment.sections ?? [])
        .map(id => allSections.find(s => s.id === id))
        .filter(Boolean) as EditorSection[]

    function copyUrl(sec: EditorSection) {
        const url = `${window.location.origin}/s/${sec.courseCode}/${sec.sectionCode}/${sec.termCode}`
        void navigator.clipboard.writeText(url)
        setCopiedSectionId(sec.id)
        setTimeout(() => setCopiedSectionId(null), 1500)
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-stretch border transition-colors',
                selected ? 'border-primary bg-muted-selected' : 'border-border',
                isDragging && 'opacity-50 z-10',
            )}
        >
            {/* Left action bar (primary) — grip, heading icon, more menu */}
            <div className="flex flex-col items-center bg-primary gap-1 py-2 px-1.5 shrink-0">
                <button
                    className="p-1.5 shrink-0 rounded-sm touch-none cursor-grab bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors"
                    {...attributes}
                    {...listeners}
                    title="Drag to reorder; move left/right to change heading level"
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <HeadingIcon className="h-4 w-4 text-primary-foreground my-1.5 shrink-0" />
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost"
                                        className="h-7 w-7 p-1.5 rounded-sm bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-2">
                            Manage Segment
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

            {/* Second action bar (cyan) — visibility, view syllabi, student progress */}
            <div className="flex flex-col items-center gap-1 py-2 px-1.5 shrink-0 bg-sidebar-foreground">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button" variant="ghost"
                            className="h-7 w-7 p-1.5 rounded-sm bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors"
                            onClick={onToggleVisible}
                        >
                            {segment.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-1">
                        {segment.isVisible ? 'Hide segment' : 'Show segment'}
                    </TooltipContent>
                </Tooltip>


                {hasSections && (
                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button" variant="ghost"
                                        className="h-7 w-7 p-1.5 rounded-sm bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors"
                                    >
                                        <Binoculars className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-1">
                                Preview Syllabus
                            </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="start" side="right" className="min-w-52">
                            {linkedSections.map(sec => (
                                <DropdownMenuGroup key={sec.id}>
                                    <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                                        {sectionLabel(sec)}
                                    </DropdownMenuLabel>
                                    {syllabus?.interactiveView ? (
                                        <>
                                            <DropdownMenuItem asChild className="focus:bg-muted-hover">
                                                <a
                                                    href={`/s/${sec.courseCode}/${sec.sectionCode}/${sec.termCode}?mode=complete`}
                                                    target="_self"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 cursor-pointer"
                                                >
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    Complete Syllabus
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-muted-hover">
                                                <a
                                                    href={`/s/${sec.courseCode}/${sec.sectionCode}/${sec.termCode}`}
                                                    target="_self"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 cursor-pointer"
                                                >
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    Interactive Syllabus
                                                </a>
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <DropdownMenuItem asChild className="focus:bg-muted-hover">
                                            <a
                                                href={`/s/${sec.courseCode}/${sec.sectionCode}/${sec.termCode}`}
                                                target="_self"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                Traditional Syllabus
                                            </a>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                            ))}
                            <DropdownMenuSeparator className="bg-popover-border" />
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                                    Copy URL
                                </DropdownMenuLabel>
                                {linkedSections.map(sec => (
                                    <DropdownMenuItem
                                        key={sec.id}
                                        onClick={() => copyUrl(sec)}
                                        onSelect={(e) => e.preventDefault()}
                                        className="flex items-center gap-2 cursor-pointer focus:bg-muted-hover"
                                    >
                                        {copiedSectionId === sec.id
                                            ? <Check className="h-4 w-4 text-green-500" />
                                            : <Copy className="h-4 w-4 text-muted-foreground" />
                                        }
                                        <span className="text-sm">{sectionLabel(sec)}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {hasSections && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button" variant="ghost"
                                className="h-7 w-7 p-1.5 rounded-sm bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors"
                                onClick={onOpenStudentProgress}
                            >
                                <ChartBar className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="ml-1">
                            Student Progress
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Clickable selection area */}
            <div
                className="flex-1 min-w-0 px-3 py-2.5 cursor-pointer hover:bg-muted-hover transition-colors"
                onClick={onSelect}
            >
                <p className="text-xs font-medium truncate">{segment.name}</p>
                <p className="text-[11px] text-muted-foreground">
                    {segment.blocks.length} block{segment.blocks.length !== 1 ? 's' : ''}
                    {!segment.isVisible && <span className="ml-1.5 opacity-60">(hidden)</span>}
                </p>
                {segment.description && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                        <span className="font-bold">Description:</span>{' '}
                        <span>{segment.description}</span>
                    </div>
                )}
                {linkedSections.length > 0 && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                        <span className="font-bold">Section(s):</span>{' '}
                        <span>{linkedSections.map(s => sectionLabel(s)).join(', ')}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Segment form ──────────────────────────────────────────────────────────────

function SegmentForm({ mode, segment, locked, availableSections, onSave, isSaving }: {
    mode: 'add' | 'edit'
    segment?: SegmentWithBlocks
    locked?: boolean
    availableSections: EditorSection[]
    onSave: (body: Record<string, unknown>) => void
    onDelete?: () => void
    isSaving: boolean
}) {
    const [form, setForm] = React.useState({
        name: segment?.name ?? '',
        description: segment?.description ?? '',
        printHeading: segment?.printHeading ?? 2,
        printingOptional: segment?.printingOptional ?? false,
        isVisible: segment?.isVisible ?? false,
        sections: segment?.sections ?? [] as string[],
    })

    React.useEffect(() => {
        if (!segment) return
        setForm({
            name: segment.name,
            description: segment.description ?? '',
            printHeading: segment.printHeading,
            printingOptional: segment.printingOptional,
            isVisible: segment.isVisible,
            sections: segment.sections ?? [],
        })
    }, [segment?.id])


    return (
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="flex-1 overflow-y-auto p-4 space-y-2">

            <Input
                label="Name"
                description="The name of this segment (visible to students)."
                value={form.name}
                disabled={locked}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="rounded-none h-8 text-xs"
                required
                placeholder="Introduction"
            />

            <Textarea
                label="Description"
                isOptional={true}
                description="A description for this segment (not visible to students)."
                value={form.description}
                disabled={locked}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="rounded-none text-xs resize-none"
                placeholder="Contains ..."
            />

            {/* Print Heading Level — choice cards */}
            <div className="space-y-2 p-3 border border-border">
                <p className="text-xs font-medium mb-0.5">Print Heading Level</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                    Defines how syllabus content is structured when printed, controlling the hierarchy and
                    indentation of headings to improve readability and organization.
                </p>
                <div className="flex flex-col gap-1.5">
                    {SEG_HEADING_OPTS.map(h => {
                        const checked = form.printHeading === h
                        return (
                            <label
                                key={h}
                                className={cn(
                                    'flex items-start gap-2.5 border p-3 cursor-pointer transition-colors',
                                    locked && 'pointer-events-none opacity-60',
                                    checked ? 'border-primary bg-muted-selected' : 'border-border hover:bg-muted-hover',
                                )}
                            >
                                <input
                                    type="radio"
                                    name="printHeading"
                                    checked={checked}
                                    onChange={() => setForm(f => ({ ...f, printHeading: h }))}
                                    disabled={locked}
                                    className="sr-only"
                                />
                                <div className={cn(
                                    'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center',
                                    checked ? 'border-primary' : 'border-muted-foreground/40',
                                )}>
                                    {checked && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                </div>
                                <div>
                                    <p className="text-xs font-medium mb-0.5">H{h}</p>
                                    <p className="text-[11px] text-muted-foreground leading-snug">{HEADING_DESCS[h]}</p>
                                </div>
                            </label>
                        )
                    })}
                </div>
            </div>

            {/* Visible — choice card */}
            <div className={cn(
                'flex items-start gap-3 border p-3 transition-colors cursor-pointer',
                locked && 'pointer-events-none opacity-60',
                form.isVisible ? 'border-primary bg-muted-selected' : 'border-border hover:bg-muted-hover',
            )} onClick={() => !locked && setForm(f => ({ ...f, isVisible: !f.isVisible }))}>
                <div className="mt-0.5 shrink-0">
                    <div className={cn(
                        'h-4 w-7 rounded-full transition-colors flex items-center px-0.5',
                        form.isVisible ? 'bg-primary justify-end' : 'bg-muted-foreground/30 justify-start',
                    )}>
                        <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
                    </div>
                </div>
                <div>
                    <p className="text-xs font-medium mb-0.5">Visible</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        {form.isVisible
                            ? 'This segment is visible to students in the student view.'
                            : 'This segment is hidden — students cannot see it in any view.'}
                    </p>
                </div>
            </div>

            {/* Printing Optional — choice card */}
            <div className={cn(
                'flex items-start gap-3 border p-3 transition-colors cursor-pointer',
                locked && 'pointer-events-none opacity-60',
                form.printingOptional ? 'border-primary bg-muted-selected' : 'border-border hover:bg-muted-hover',
            )} onClick={() => !locked && setForm(f => ({ ...f, printingOptional: !f.printingOptional }))}>
                <div className="mt-0.5 shrink-0">
                    <div className={cn(
                        'h-4 w-7 rounded-full transition-colors flex items-center px-0.5',
                        form.printingOptional ? 'bg-primary justify-end' : 'bg-muted-foreground/30 justify-start',
                    )}>
                        <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
                    </div>
                </div>
                <div>
                    <p className="text-xs font-medium mb-0.5">Printing Optional</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        {form.printingOptional
                            ? 'Students can choose whether to include this segment when printing.'
                            : 'This segment is always included when a student prints a traditional syllabus.'}
                    </p>
                </div>
            </div>

            {/* Sections picker */}
            <div className="space-y-2 p-3 border border-border focus-within:bg-input-focus focus-within:ring-1 focus-within:ring-ring">
                <p className="text-xs">Sections <span className="text-muted-foreground">(optional)</span></p>
                <p className="text-[11px] text-muted-foreground">
                    If no sections are selected, this segment is shared across all sections.
                </p>
                <SectionMultiSelect
                    sections={availableSections}
                    value={form.sections}
                    onChange={ids => setForm(f => ({ ...f, sections: ids }))}
                    disabled={locked}
                />
            </div>

            {!locked && (
                <div className="pt-2">
                    <Button type="submit" disabled={isSaving} className="w-full flex-1 rounded-none h-9 bg-primary text-primary-foreground hover:bg-primary/80">
                        {isSaving
                            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{mode === 'add' ? 'Creating…' : 'Saving…'}</>
                            : mode === 'add' ? 'Create Segment' : 'Save Segment'}
                    </Button>
                </div>
            )}
        </form>
    )
}

// ── Column 2: Segment Management ──────────────────────────────────────────────

export function SegmentColumn({
    syllabus, segments, detailLoading, locked,
    col2Mode, setCol2Mode,
    editingSegmentId, setEditingSegmentId,
    selectedSegmentId, onSelectSegment,
    onAddSegment, onUpdateSegment, onDeleteSegment, onReorderSegments,
    isAdding, isUpdating,
    mobileBack,
    syllabi,
    allSections,
    terms,
    onCopySegment,
    isCopyingSegment,
    onOpenStudentProgress,
}: {
    syllabus?: MasterSyllabus
    segments: SegmentWithBlocks[]
    detailLoading: boolean
    locked: boolean
    col2Mode: Col2Mode
    setCol2Mode: (m: Col2Mode) => void
    editingSegmentId: string | null
    setEditingSegmentId: (id: string | null) => void
    selectedSegmentId: string | null
    onSelectSegment: (id: string) => void
    onAddSegment: (body: Record<string, unknown>) => void
    onUpdateSegment: (segId: string, body: Record<string, unknown>) => void
    onDeleteSegment: (segId: string) => void
    onReorderSegments: (orderedIds: string[]) => void
    onEditSettings: () => void
    isAdding: boolean
    isUpdating: boolean
    mobileBack?: () => void
    syllabi: MasterSyllabus[]
    allSections: EditorSection[]
    terms: { id: string; code: string }[]
    onCopySegment: (sourceSyllabusId: string, sourceSegmentId: string, sections: string[]) => void
    isCopyingSegment: boolean
    onOpenStudentProgress: (segId: string) => void
}) {
    const [libraryOpen, setLibraryOpen] = React.useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [draggingHeading, setDraggingHeading] = React.useState<number | null>(null)
    const [optimisticHeadings, setOptimisticHeadings] = React.useState<Record<string, number>>({})
    const draggingHeadingRef = React.useRef<number | null>(null)
    const dragStartHeadingRef = React.useRef<number>(2)
    const listRef = React.useRef<HTMLDivElement>(null)

    const availableSections = React.useMemo(() => {
        const termId = terms.find(t => t.code === syllabus?.termCode)?.id
        return termId ? allSections.filter(s => s.termId === termId) : []
    }, [allSections, terms, syllabus?.termCode])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const sortedSegments = [...segments].sort((a, b) => a.sortOrder - b.sortOrder)

    // Clear optimistic headings once the server data catches up
    React.useEffect(() => {
        setOptimisticHeadings(prev => {
            const next = { ...prev }
            let changed = false
            for (const seg of segments) {
                if (next[seg.id] !== undefined && next[seg.id] === seg.printHeading) {
                    delete next[seg.id]
                    changed = true
                }
            }
            return changed ? next : prev
        })
    }, [segments])

    // Track pointer X position relative to the list container to determine heading zone
    React.useEffect(() => {
        if (!activeId) return
        function onPointerMove(e: PointerEvent) {
            if (!listRef.current) return
            const rect = listRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left - 12
            const heading = Math.min(6, Math.max(2, Math.round(x / 16) + 2))
            draggingHeadingRef.current = heading
            setDraggingHeading(heading)
        }
        document.addEventListener('pointermove', onPointerMove)
        return () => document.removeEventListener('pointermove', onPointerMove)
    }, [activeId])

    function handleDragStart(event: DragStartEvent) {
        const seg = sortedSegments.find(s => s.id === event.active.id)
        if (seg) {
            setActiveId(String(event.active.id))
            dragStartHeadingRef.current = seg.printHeading
            draggingHeadingRef.current = seg.printHeading
            setDraggingHeading(seg.printHeading)
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const finalHeading = draggingHeadingRef.current
        const headingChanged = finalHeading !== null && finalHeading !== dragStartHeadingRef.current
        const segId = activeId

        setActiveId(null)
        setDraggingHeading(null)
        draggingHeadingRef.current = null

        if (headingChanged && segId && finalHeading !== null) {
            setOptimisticHeadings(prev => ({ ...prev, [segId]: finalHeading }))
            onUpdateSegment(segId, { printHeading: finalHeading })
        }

        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIdx = sortedSegments.findIndex(s => s.id === active.id)
        const newIdx = sortedSegments.findIndex(s => s.id === over.id)
        onReorderSegments(arrayMove(sortedSegments, oldIdx, newIdx).map(s => s.id))
    }

    const editingSegment = segments.find(s => s.id === editingSegmentId)
    const deleteConfirmSegment = segments.find(s => s.id === deleteConfirmId)

    return (
        <div className="column bg-column-center w-full md:w-64 xl:w-96 md:shrink-0 md:border-r flex flex-col overflow-hidden">

            {col2Mode === 'listSegments' && (
                <>
                    <ColHeader title={syllabus?.title ?? '…'} subtitle={`${segments.length} segment${segments.length !== 1 ? 's' : ''}`} onBack={mobileBack}>
                        {!locked && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1 px-2 h-7 text-xs font-medium bg-black/10 hover:bg-black/20 rounded-sm transition-colors shrink-0">
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setCol2Mode('addSegment')} className="focus:bg-muted-hover">
                                        <NotebookTabs className="h-4 w-4 mr-2" />Create Segment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setLibraryOpen(true)} className="focus:bg-muted-hover">
                                        <Copy className="h-4 w-4 mr-2" />Copy Segment(s)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </ColHeader>

                    <div ref={listRef} className="relative flex-1 overflow-y-auto overflow-x-hidden p-3">
                        {/* Vertical grid lines — shown while dragging to indicate heading snap zones */}
                        {activeId && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {[2, 3, 4, 5, 6].map(h => (
                                    <div
                                        key={h}
                                        className={cn(
                                            'absolute top-0 bottom-0 w-0 border-l border-dashed',
                                            draggingHeading === h ? 'border-primary' : 'border-foreground/30',
                                        )}
                                        style={{ left: `${12 + (h - 2) * 16}px` }}
                                    />
                                ))}
                            </div>
                        )}

                        {detailLoading ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading segments…
                            </div>
                        ) : sortedSegments.length === 0 ? (
                            <p className="flex items-center justify-center py-12 text-muted-foreground text-sm">No segments yet.</p>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={sortedSegments.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <div className="flex flex-col gap-2">
                                        {sortedSegments.map(seg => (
                                            <SortableSegmentRow
                                                key={seg.id}
                                                segment={optimisticHeadings[seg.id] !== undefined
                                                    ? { ...seg, printHeading: optimisticHeadings[seg.id] }
                                                    : seg}
                                                selected={selectedSegmentId === seg.id}
                                                draggingHeading={activeId === seg.id ? draggingHeading : null}
                                                allSections={availableSections}
                                                syllabus={syllabus}
                                                onSelect={() => onSelectSegment(seg.id)}
                                                onEdit={() => { setEditingSegmentId(seg.id); setCol2Mode('editSegment') }}
                                                onDelete={() => setDeleteConfirmId(seg.id)}
                                                onToggleVisible={() => {
                                                    if (!locked) onUpdateSegment(seg.id, { isVisible: !seg.isVisible })
                                                }}
                                                onOpenStudentProgress={() => onOpenStudentProgress(seg.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </>
            )}

            {col2Mode === 'addSegment' && (
                <>
                    <ColHeader title="Create Segment" subtitle="" icon={<NotebookTabs className="h-5 w-5" />} onBack={() => setCol2Mode('listSegments')} />
                    <SegmentForm
                        mode="add"
                        availableSections={availableSections}
                        onSave={onAddSegment}
                        isSaving={isAdding}
                    />
                </>
            )}

            {col2Mode === 'editSegment' && editingSegmentId && (
                <>
                    <ColHeader title="Edit Segment" subtitle="" icon={<NotebookTabs className="h-5 w-5" />} onBack={() => setCol2Mode('listSegments')}>
                        {!locked && <DeleteButton onClick={() => setDeleteConfirmId(editingSegmentId)} />}
                    </ColHeader>
                    <SegmentForm
                        mode="edit"
                        segment={editingSegment}
                        locked={locked}
                        availableSections={availableSections}
                        onSave={body => onUpdateSegment(editingSegmentId, body)}
                        isSaving={isUpdating}
                    />
                </>
            )}

            <ContentLibraryDialog
                mode="segment"
                open={libraryOpen}
                onClose={() => setLibraryOpen(false)}
                syllabi={syllabi}
                availableSections={availableSections}
                onCopySegment={(sourceSyllabusId, sourceSegmentId, sections) => {
                    onCopySegment(sourceSyllabusId, sourceSegmentId, sections)
                    setLibraryOpen(false)
                }}
                isCopying={isCopyingSegment}
            />

            {/* Delete confirmation */}
            <Dialog open={!!deleteConfirmId} onOpenChange={v => !v && setDeleteConfirmId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Segment</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <strong>{deleteConfirmSegment?.name ?? 'this segment'}</strong> and all its blocks. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => { onDeleteSegment(deleteConfirmId!); setDeleteConfirmId(null) }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
