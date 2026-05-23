import React from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api/client'
import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from '@/components/nav/sidebar'
import { SidebarProvider } from '@/components/nav/sidebar-context'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BLOCK_META } from '@/routes/editor/shared'
import { BlockRenderer } from './block-renderer'
import type { MasterSyllabus, SyllabusSegment, SyllabusBlock } from '@syllabee/types'

interface ApiQuickLink {
    id: string
    label: string
    url: string
    icon: string
    restricted: boolean
    sortOrder: number
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ViewerSection {
    courseCode: string
    termCode: string
    sectionCode: string
    courseName: string
    termName: string
    instructorId: string
}

interface ViewerBranding {
    institutionName: string | null
}

interface ViewerBlock extends SyllabusBlock {
    segmentName: string
    segmentId: string
}

interface ViewerResponse {
    syllabus: MasterSyllabus
    section: ViewerSection
    segments: (SyllabusSegment & { blocks: SyllabusBlock[] })[]
    branding: ViewerBranding
    isAvailable: boolean
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SyllabusViewerPage() {
    const { courseCode, termCode, sectionCode } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user } = useAuth()

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['viewer', courseCode, termCode, sectionCode],
        queryFn: () =>
            apiFetch<{ data: ViewerResponse }>(`/viewer/${courseCode}/${sectionCode}/${termCode}`)
                .then(r => r.data!),
        enabled: !!courseCode && !!termCode && !!sectionCode,
    })

    const viewerErrorMessage = error instanceof ApiError
        ? error.message
        : isError
            ? 'Syllabus not found.'
            : null

    const { data: quickLinkData } = useQuery({
        queryKey: ['quick-links'],
        queryFn: () => apiFetch<{ data: ApiQuickLink[] }>('/admin/quick-links').then(r => r.data ?? []),
        staleTime: 1000 * 60 * 10,
    })

    const publicLinks = (quickLinkData ?? []).filter(l => !l.restricted)
    const restrictedLinks = user ? (quickLinkData ?? []).filter(l => l.restricted) : []

    const isInteractive = !!(data?.syllabus.interactiveView && searchParams.get('mode') !== 'complete')
    const isInstructor = !!user && data?.section.instructorId === user.id
    const canSeeAll = isInstructor

    const syllabus = data?.syllabus
    const segments = data?.segments ?? []
    const isAvailable = canSeeAll || (data?.isAvailable ?? true)

    // Flat list of all blocks across all segments, for interactive step-through
    const allBlocks: ViewerBlock[] = React.useMemo(() =>
        segments.flatMap(seg =>
            seg.blocks.map(blk => ({ ...blk, segmentName: seg.name, segmentId: seg.id }))
        ),
        [segments]
    )

    const [currentIndex, setCurrentIndex] = React.useState(0)

    // Reset index when mode or data changes
    React.useEffect(() => { setCurrentIndex(0) }, [isInteractive, data])

    function viewerUrl(mode?: string) {
        const base = `/s/${courseCode}/${sectionCode}/${termCode}`
        return mode ? `${base}?mode=${mode}` : base
    }

    if (isLoading) {
        return (
            <SidebarProvider>
                <div className="flex h-screen items-center justify-center">
                    <p className="text-sm text-muted-foreground">Loading syllabus…</p>
                </div>
            </SidebarProvider>
        )
    }

    if (isError || !data) {
        return (
            <SidebarProvider>
                <div className="flex h-screen items-center justify-center px-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        {viewerErrorMessage ?? 'Syllabus not found.'}
                    </p>
                </div>
            </SidebarProvider>
        )
    }

    return (
        <SidebarProvider>
            <div className="flex h-screen overflow-hidden">
                {/* Left sidebar — shown for all users */}
                <Sidebar
                    isAdmin={false}
                    quickLinks={publicLinks.map(l => ({ id: l.id, label: l.label, url: l.url, icon: l.icon ?? '' }))}
                    restrictedQuickLinks={restrictedLinks.map(l => ({ id: l.id, label: l.label, url: l.url, icon: l.icon ?? '' }))}
                />

                {/* Content + ToC grid */}
                <div
                    className="flex-1 overflow-hidden grid"
                    style={{ gridTemplateColumns: '4fr 2fr' }}
                >
                    {/* ── Main content column ──────────────────────────────── */}
                    <div className="flex flex-col overflow-hidden">
                        {/* Sticky header */}
                        <div className="shrink-0 bg-primary text-primary-foreground px-8 py-5">
                            <h1 className="text-xl font-bold leading-tight">
                                {data.section.courseCode} - {data.section.courseName} - {data.section.termName}
                            </h1>
                            {data.branding.institutionName && (
                                <p className="text-sm text-primary-foreground/70 mt-1">
                                    {data.branding.institutionName}
                                </p>
                            )}
                        </div>

                        {/* Scrollable content */}
                        <main className="flex-1 overflow-y-auto px-8 py-6">
                            {!isAvailable ? (
                                <UnavailableMessage />
                            ) : isInteractive ? (
                                <InteractiveContent
                                    allBlocks={allBlocks}
                                    currentIndex={currentIndex}
                                    setCurrentIndex={setCurrentIndex}
                                    syllabus={syllabus!}
                                />
                            ) : (
                                <CompleteContent segments={segments} syllabus={syllabus!} />
                            )}
                        </main>
                    </div>

                    {/* ── ToC column ───────────────────────────────────────── */}
                    <aside className="border-l overflow-y-auto px-4 py-4 space-y-0">
                        <TocColumn
                            syllabus={syllabus!}
                            segments={segments}
                            allBlocks={allBlocks}
                            isInteractive={isInteractive}
                            isAvailable={isAvailable}
                            canSeeAll={canSeeAll}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            onInteractiveView={() => navigate(viewerUrl())}
                            onCompleteView={() => navigate(viewerUrl('complete'))}
                            onEditorView={() => navigate('/editor')}
                        />
                    </aside>
                </div>
            </div>
        </SidebarProvider>
    )
}

// ── Unavailable message ───────────────────────────────────────────────────────

function UnavailableMessage() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <p className="text-lg font-semibold mb-2">Syllabus Unavailable</p>
            <p className="text-sm text-muted-foreground">
                This syllabus is currently unavailable. Please contact your instructor for questions or concerns.
            </p>
        </div>
    )
}

// ── Complete / Traditional content ────────────────────────────────────────────

function CompleteContent({
    segments,
    syllabus,
}: {
    segments: (SyllabusSegment & { blocks: SyllabusBlock[] })[]
    syllabus: MasterSyllabus
}) {
    return (
        <div className="space-y-10 max-w-3xl">
            {segments.map(seg => {
                const HeadingTag = `h${Math.min(6, Math.max(2, seg.printHeading))}` as React.ElementType
                const blocks = [...seg.blocks].sort((a, b) => a.sortOrder - b.sortOrder)

                // Group blocks by printGroup
                const grouped: (SyllabusBlock | SyllabusBlock[])[] = []
                const groupMap: Record<string, SyllabusBlock[]> = {}
                for (const blk of blocks) {
                    if (blk.printGroup) {
                        if (!groupMap[blk.printGroup]) {
                            groupMap[blk.printGroup] = []
                            grouped.push(groupMap[blk.printGroup])
                        }
                        groupMap[blk.printGroup].push(blk)
                    } else {
                        grouped.push(blk)
                    }
                }

                return (
                    <section key={seg.id} id={seg.id}>
                        <HeadingTag className={cn(
                            'font-bold mb-4 text-foreground',
                            seg.printHeading === 2 && 'text-2xl',
                            seg.printHeading === 3 && 'text-xl',
                            seg.printHeading === 4 && 'text-lg',
                            seg.printHeading >= 5 && 'text-base',
                        )}>
                            {seg.name}
                        </HeadingTag>

                        <div className="space-y-6">
                            {grouped.map((item, idx) => {
                                if (Array.isArray(item)) {
                                    return (
                                        <div key={idx} className="space-y-0">
                                            {item.map(blk => (
                                                <div key={blk.id} id={blk.id}>
                                                    <BlockRenderer block={blk} isInteractive={false} />
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }
                                if (item.type === 'response_block') return null
                                return (
                                    <div key={item.id} id={item.id}>
                                        <BlockRenderer block={item} isInteractive={false} />
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}

// ── Interactive content ────────────────────────────────────────────────────────

function InteractiveContent({
    allBlocks,
    currentIndex,
    setCurrentIndex,
    syllabus,
}: {
    allBlocks: ViewerBlock[]
    currentIndex: number
    setCurrentIndex: (i: number) => void
    syllabus: MasterSyllabus
}) {
    const current = allBlocks[currentIndex]
    const prev = currentIndex > 0 ? allBlocks[currentIndex - 1] : null
    const isFirst = currentIndex === 0
    const isLast = currentIndex === allBlocks.length - 1
    const prohibit = syllabus.prohibitBacktracking

    if (!current) {
        return <p className="text-sm text-muted-foreground">No content available.</p>
    }

    // Show segment label when segment changes
    const showSegmentLabel = currentIndex === 0 || allBlocks[currentIndex - 1]?.segmentId !== current.segmentId

    return (
        <div className="max-w-3xl space-y-6">
            {showSegmentLabel && (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {current.segmentName}
                </p>
            )}

            <div key={current.id} id={current.id}>
                <BlockRenderer
                    block={current}
                    isInteractive
                    responseProps={{
                        maxAttempts: syllabus.maxAttempts,
                        pointsLadder: syllabus.pointsLadder,
                        pointsLadderDeduction: syllabus.pointsLadderDeduction,
                    }}
                />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isFirst || prohibit}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>

                {!isLast ? (
                    <Button
                        size="sm"
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                    >
                        Continue<ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                ) : (
                    <Button size="sm" disabled>
                        Completed ✓
                    </Button>
                )}

                <span className="text-xs text-muted-foreground ml-auto">
                    {currentIndex + 1} / {allBlocks.length}
                </span>
            </div>
        </div>
    )
}

// ── ToC column ────────────────────────────────────────────────────────────────

function TocColumn({
    syllabus,
    segments,
    allBlocks,
    isInteractive,
    isAvailable,
    canSeeAll,
    currentIndex,
    setCurrentIndex,
    onInteractiveView,
    onCompleteView,
    onEditorView,
}: {
    syllabus: MasterSyllabus
    segments: (SyllabusSegment & { blocks: SyllabusBlock[] })[]
    allBlocks: ViewerBlock[]
    isInteractive: boolean
    isAvailable: boolean
    canSeeAll: boolean
    currentIndex: number
    setCurrentIndex: (i: number) => void
    onInteractiveView: () => void
    onCompleteView: () => void
    onEditorView: () => void
}) {
    const prohibit = isInteractive && syllabus.prohibitBacktracking

    function scrollToBlock(blockId: string) {
        document.getElementById(blockId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    function jumpToBlock(blockId: string) {
        const idx = allBlocks.findIndex(b => b.id === blockId)
        if (idx !== -1) setCurrentIndex(idx)
    }

    return (
        <div className="text-sm space-y-4">
            {/* Instructor info */}
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Instructor
                </p>
                {syllabus.officeHours && (
                    <div className="mb-1">
                        <span className="text-xs text-muted-foreground font-medium">Office Hours: </span>
                        <span className="text-xs">{syllabus.officeHours}</span>
                    </div>
                )}
                <p className="text-xs text-muted-foreground italic">Instructor info coming soon.</p>
            </div>

            {canSeeAll && (
                <>
                    <Separator />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Instructor Options
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {syllabus.interactiveView && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-xs"
                                    onClick={onInteractiveView}
                                >
                                    Interactive View
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={onCompleteView}
                            >
                                Complete View
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={onEditorView}
                            >
                                Editor View
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs text-muted-foreground"
                                disabled
                            >
                                Student Progress
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {isAvailable && !(isInteractive && syllabus.prohibitBacktracking) && (
                <>
                    <Separator />
                    <div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs gap-2"
                            onClick={() => window.print()}
                        >
                            <Printer className="h-3.5 w-3.5" />Print
                        </Button>
                    </div>
                </>
            )}

            {isAvailable && !prohibit && (
                <>
                    <Separator />
                    <nav>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Contents
                        </p>
                        <div className="space-y-0.5">
                            {segments.map(seg => (
                                <React.Fragment key={seg.id}>
                                    <p className="text-xs font-semibold text-foreground py-1 mt-2 first:mt-0">
                                        {seg.name}
                                    </p>
                                    {[...seg.blocks]
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map(blk => {
                                            const { Icon } = BLOCK_META[blk.type] ?? {}
                                            const indent = Math.max(0, (blk.printHeading ?? 3) - 3) * 12
                                            return (
                                                <button
                                                    key={blk.id}
                                                    onClick={() => isInteractive ? jumpToBlock(blk.id) : scrollToBlock(blk.id)}
                                                    className={cn(
                                                        'flex items-center gap-1.5 w-full text-left text-xs text-muted-foreground',
                                                        'hover:text-foreground transition-colors py-0.5 rounded',
                                                        isInteractive && allBlocks[currentIndex]?.id === blk.id && 'text-primary font-medium',
                                                    )}
                                                    style={{ paddingLeft: `${indent}px` }}
                                                >
                                                    {Icon && <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />}
                                                    <span className="truncate">{blk.name}</span>
                                                </button>
                                            )
                                        })}
                                </React.Fragment>
                            ))}
                        </div>
                    </nav>
                </>
            )}
        </div>
    )
}
