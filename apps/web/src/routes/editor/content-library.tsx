import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Copy, FileText, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { BLOCK_META } from './shared'
import { SectionMultiSelect, sectionLabel } from './section-multi-select'
import type { EditorSection, MasterSyllabus, SyllabusDetail } from '@syllabee/types'

// ── Content Library Dialog ────────────────────────────────────────────────────

export function ContentLibraryDialog({
    mode, open, onClose, syllabi, onCopySegment, onCopyBlock, isCopying, availableSections = [],
}: {
    mode: 'segment' | 'block'
    open: boolean
    onClose: () => void
    syllabi: MasterSyllabus[]
    onCopySegment?: (sourceSyllabusId: string, sourceSegmentId: string, sections: string[]) => void
    onCopyBlock?: (sourceSyllabusId: string, sourceSegmentId: string, sourceBlockId: string) => void
    isCopying: boolean
    availableSections?: EditorSection[]
}) {
    const [selectedSyllabusId, setSelectedSyllabusId] = React.useState<string | null>(null)
    const [expandedSegmentId, setExpandedSegmentId] = React.useState<string | null>(null)

    // Segment wizard
    const [step, setStep] = React.useState<'select' | 'sections' | 'confirm'>('select')
    const [selectedSegments, setSelectedSegments] = React.useState<Set<string>>(new Set())
    const [segmentSections, setSegmentSections] = React.useState<Record<string, string[]>>({})
    const [mobileExpandedId, setMobileExpandedId] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!open) {
            setSelectedSyllabusId(null)
            setExpandedSegmentId(null)
            setStep('select')
            setSelectedSegments(new Set())
            setSegmentSections({})
            setMobileExpandedId(null)
        }
    }, [open])

    const { data: syllabusData, isLoading } = useQuery({
        queryKey: ['syllabus-library', selectedSyllabusId],
        queryFn: () => apiFetch<{ data: SyllabusDetail }>(`/editor/syllabi/${selectedSyllabusId}`).then(r => r.data),
        enabled: !!selectedSyllabusId,
    })

    const segments = React.useMemo(
        () => [...(syllabusData?.segments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
        [syllabusData],
    )

    const selectedSegmentDetails = React.useMemo(
        () => segments.filter(seg => selectedSegments.has(seg.id)),
        [segments, selectedSegments],
    )

    function handleSelectSyllabus(syllabusId: string) {
        if (selectedSyllabusId !== syllabusId) {
            setSelectedSegments(new Set())
            setSelectedSyllabusId(syllabusId)
        }
        setExpandedSegmentId(null)
    }

    function handleMobileSyllabusToggle(syllabusId: string) {
        if (mobileExpandedId === syllabusId) {
            setMobileExpandedId(null)
        } else {
            if (selectedSyllabusId !== syllabusId) {
                setSelectedSegments(new Set())
                setSelectedSyllabusId(syllabusId)
            }
            setMobileExpandedId(syllabusId)
        }
    }

    function toggleSegment(segId: string) {
        setSelectedSegments(prev => {
            const next = new Set(prev)
            if (next.has(segId)) next.delete(segId)
            else next.add(segId)
            return next
        })
    }

    function handleConfirmCopy() {
        if (!selectedSyllabusId) return
        Array.from(selectedSegments).forEach(segId => {
            onCopySegment?.(selectedSyllabusId, segId, segmentSections[segId] ?? [])
        })
    }

    const stepDescription = mode === 'block'
        ? 'Select a block to copy it into this segment.'
        : step === 'select'
            ? 'Select one or more segments to deep-copy into this syllabus.'
            : step === 'sections'
                ? 'Assign sections to each selected segment (optional).'
                : 'Review your selection, then click Copy.'

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="max-w-2xl p-0 gap-0">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm">Content Library</DialogTitle>
                    <DialogDescription className="text-xs">{stepDescription}</DialogDescription>
                </DialogHeader>

                <div className="flex h-[420px] overflow-hidden">

                    {/* ── Block mode (unchanged) ──────────────────────────────────── */}
                    {mode === 'block' && (
                        <>
                            <div className="w-52 shrink-0 border-r flex flex-col overflow-hidden">
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/40">
                                    Syllabi
                                </p>
                                <div className="flex-1 overflow-y-auto">
                                    {syllabi.length === 0 ? (
                                        <p className="text-xs text-muted-foreground px-3 py-4 text-center">No syllabi</p>
                                    ) : syllabi.map(s => (
                                        <button
                                            key={s.id}
                                            className={cn(
                                                'w-full text-left px-3 py-2 border-b border-muted/40 hover:bg-muted/40 transition-colors',
                                                selectedSyllabusId === s.id && 'bg-muted',
                                            )}
                                            onClick={() => { setSelectedSyllabusId(s.id); setExpandedSegmentId(null) }}
                                        >
                                            <p className="text-xs font-medium truncate">{s.title}</p>
                                            <p className="text-[11px] text-muted-foreground">{s.termCode ?? '—'}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {!selectedSyllabusId ? (
                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                        Select a syllabus to browse its content
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : segments.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                        No segments
                                    </div>
                                ) : (
                                    <div className="p-3 flex flex-col gap-1.5">
                                        {segments.map(seg => {
                                            const isExpanded = expandedSegmentId === seg.id
                                            const sortedBlocks = [...seg.blocks].sort((a, b) => a.sortOrder - b.sortOrder)
                                            return (
                                                <div key={seg.id}>
                                                    <button
                                                        className={cn(
                                                            'flex items-center gap-2 w-full text-left px-3 py-2 border transition-colors',
                                                            isExpanded ? 'border-primary bg-muted' : 'border-border hover:bg-muted/40',
                                                        )}
                                                        onClick={() => setExpandedSegmentId(isExpanded ? null : seg.id)}
                                                    >
                                                        <ChevronRight className={cn(
                                                            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                                                            isExpanded && 'rotate-90',
                                                        )} />
                                                        <p className="text-xs font-medium flex-1 truncate">{seg.name}</p>
                                                        <span className="text-[11px] text-muted-foreground shrink-0">
                                                            {seg.blocks.length} block{seg.blocks.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </button>
                                                    {isExpanded && sortedBlocks.map(block => {
                                                        const { label, Icon } = BLOCK_META[block.type] ?? { label: block.type, Icon: FileText }
                                                        return (
                                                            <button
                                                                key={block.id}
                                                                disabled={isCopying}
                                                                className="flex items-center gap-2 w-full text-left pl-8 pr-3 py-2 border border-t-0 border-border hover:border-primary/60 hover:bg-muted/40 transition-colors disabled:opacity-50"
                                                                onClick={() => onCopyBlock?.(selectedSyllabusId, seg.id, block.id)}
                                                            >
                                                                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs truncate">{block.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground">{label}</p>
                                                                </div>
                                                                <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── Segment mode: Step 1 — Select ──────────────────────────── */}
                    {mode === 'segment' && step === 'select' && (
                        <>
                            {/* Desktop split-pane — hidden on mobile */}
                            <div className="hidden md:flex w-52 shrink-0 border-r flex-col overflow-hidden">
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/40">
                                    Syllabi
                                </p>
                                <div className="flex-1 overflow-y-auto">
                                    {syllabi.length === 0 ? (
                                        <p className="text-xs text-muted-foreground px-3 py-4 text-center">No syllabi</p>
                                    ) : syllabi.map(s => (
                                        <button
                                            key={s.id}
                                            className={cn(
                                                'w-full text-left px-3 py-2 border-b border-muted/40 hover:bg-muted/40 transition-colors',
                                                selectedSyllabusId === s.id && 'bg-muted',
                                            )}
                                            onClick={() => handleSelectSyllabus(s.id)}
                                        >
                                            <p className="text-xs font-medium truncate">{s.title}</p>
                                            <p className="text-[11px] text-muted-foreground">{s.termCode ?? '—'}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="hidden md:flex flex-1 flex-col overflow-y-auto">
                                {!selectedSyllabusId ? (
                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                        Select a syllabus to browse its content
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : segments.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                        No segments
                                    </div>
                                ) : (
                                    <div className="p-3 flex flex-col gap-2">
                                        {segments.map(seg => (
                                            <button
                                                key={seg.id}
                                                className={cn(
                                                    'flex items-center gap-2 text-left w-full px-3 py-2.5 border transition-colors',
                                                    selectedSegments.has(seg.id)
                                                        ? 'border-primary bg-muted'
                                                        : 'border-border hover:border-primary/60 hover:bg-muted/40',
                                                )}
                                                onClick={() => toggleSegment(seg.id)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{seg.name}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {seg.blocks.length} block{seg.blocks.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mobile single-column accordion */}
                            <div className="md:hidden flex-1 overflow-y-auto">
                                {syllabi.length === 0 ? (
                                    <p className="text-xs text-muted-foreground px-3 py-4 text-center">No syllabi</p>
                                ) : syllabi.map(s => {
                                    const isExpanded = mobileExpandedId === s.id
                                    const mobileLoading = isExpanded && selectedSyllabusId === s.id && isLoading
                                    const mobileSegments = isExpanded && selectedSyllabusId === s.id ? segments : []
                                    return (
                                        <div key={s.id}>
                                            <button
                                                className={cn(
                                                    'flex items-center gap-2 w-full text-left px-3 py-2.5 border-b border-muted/40 hover:bg-muted/40 transition-colors',
                                                    isExpanded && 'bg-muted/40',
                                                )}
                                                onClick={() => handleMobileSyllabusToggle(s.id)}
                                            >
                                                <ChevronRight className={cn(
                                                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                                                    isExpanded && 'rotate-90',
                                                )} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{s.title}</p>
                                                    <p className="text-[11px] text-muted-foreground">{s.termCode ?? '—'}</p>
                                                </div>
                                            </button>
                                            {isExpanded && (
                                                mobileLoading ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : mobileSegments.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground px-6 py-2 italic">No segments</p>
                                                ) : mobileSegments.map(seg => (
                                                    <button
                                                        key={seg.id}
                                                        className={cn(
                                                            'flex items-center gap-2 text-left w-full pl-8 pr-3 py-2 border-b border-muted/40 transition-colors',
                                                            selectedSegments.has(seg.id)
                                                                ? 'bg-muted border-l-2 border-l-primary'
                                                                : 'hover:bg-muted/40',
                                                        )}
                                                        onClick={() => toggleSegment(seg.id)}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium truncate">{seg.name}</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {seg.blocks.length} block{seg.blocks.length !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Segment mode: Step 2 — Assign Sections ─────────────────── */}
                    {mode === 'segment' && step === 'sections' && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {selectedSegmentDetails.map(seg => (
                                <div key={seg.id} className="space-y-2">
                                    <div>
                                        <p className="text-xs font-semibold">{seg.name}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {seg.blocks.length} block{seg.blocks.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="border border-border p-3 space-y-1.5">
                                        <p className="text-[11px] text-muted-foreground">
                                            Assign sections (optional). If none selected, this segment is shared across all sections.
                                        </p>
                                        <SectionMultiSelect
                                            sections={availableSections}
                                            value={segmentSections[seg.id] ?? []}
                                            onChange={ids => setSegmentSections(prev => ({ ...prev, [seg.id]: ids }))}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Segment mode: Step 3 — Confirm ─────────────────────────── */}
                    {mode === 'segment' && step === 'confirm' && (
                        <div className="flex-1 overflow-y-auto p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                                {selectedSegments.size} segment{selectedSegments.size !== 1 ? 's' : ''} to copy
                            </p>
                            <div className="flex flex-col gap-2">
                                {selectedSegmentDetails.map(seg => {
                                    const sections = segmentSections[seg.id] ?? []
                                    const sectionLabels = sections
                                        .map(id => availableSections.find(s => s.id === id))
                                        .filter(Boolean)
                                        .map(s => sectionLabel(s!))
                                    return (
                                        <div key={seg.id} className="border border-border p-3">
                                            <p className="text-xs font-medium">{seg.name}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {sectionLabels.length === 0
                                                    ? 'Shared — no sections assigned'
                                                    : sectionLabels.join(', ')}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Segment wizard footer */}
                {mode === 'segment' && (
                    <div className="px-4 py-3 border-t flex items-center justify-between">
                        {step === 'select' ? (
                            <>
                                <span className="text-[11px] text-muted-foreground">
                                    {selectedSegments.size > 0 ? `${selectedSegments.size} selected` : ''}
                                </span>
                                <Button
                                    size="sm"
                                    className="rounded-none h-8 text-xs"
                                    disabled={selectedSegments.size === 0}
                                    onClick={() => setStep('sections')}
                                >
                                    Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </>
                        ) : step === 'sections' ? (
                            <>
                                <Button variant="outline" size="sm" className="rounded-none h-8 text-xs"
                                    onClick={() => setStep('select')}>
                                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
                                </Button>
                                <Button size="sm" className="rounded-none h-8 text-xs"
                                    onClick={() => setStep('confirm')}>
                                    Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" className="rounded-none h-8 text-xs"
                                    onClick={() => setStep('sections')}>
                                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isCopying}
                                    className="rounded-none h-8 text-xs bg-primary text-black hover:bg-primary/80"
                                    onClick={handleConfirmCopy}
                                >
                                    {isCopying
                                        ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Copying…</>
                                        : 'Copy'}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
