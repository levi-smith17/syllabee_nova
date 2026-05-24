import React from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChartBar, ChevronLeft, ChevronRight, FileText, Pencil, Presentation, Printer } from 'lucide-react'
import { apiFetch, ApiError } from '@/lib/api/client'
import { useAuth } from '@/hooks/use-auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Sidebar } from '@/components/nav/sidebar'
import { SidebarProvider } from '@/components/nav/sidebar-context'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
    const { data: profile } = useCurrentUser({ enabled: !!user })
    const isAdmin = !!profile?.isAdmin

    const { data, isPending, isError, error } = useQuery({
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

    return (
        <SidebarProvider>
            <div className="flex h-screen overflow-hidden">
                <Sidebar
                    isAdmin={isAdmin}
                    quickLinks={publicLinks.map(l => ({ id: l.id, label: l.label, url: l.url, icon: l.icon ?? '' }))}
                    restrictedQuickLinks={restrictedLinks.map(l => ({ id: l.id, label: l.label, url: l.url, icon: l.icon ?? '' }))}
                />

                <div
                    className="flex-1 overflow-hidden grid"
                    style={{ gridTemplateColumns: '4fr 2fr' }}
                >
                    <div className="flex flex-col overflow-hidden">
                        <ViewerHeader
                            loading={isPending}
                            courseCode={courseCode}
                            termCode={termCode}
                            section={data?.section}
                            institutionName={data?.branding.institutionName}
                        />

                        <main className="flex-1 overflow-y-auto p-3">
                            {isPending ? (
                                <ViewerContentSkeleton />
                            ) : isError || !data ? (
                                <ViewerErrorMessage message={viewerErrorMessage ?? 'Syllabus not found.'} />
                            ) : !isAvailable ? (
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

                    <aside className="bg-sidebar border-l overflow-y-auto px-4 py-4 space-y-0">
                        {isPending ? (
                            <ViewerTocSkeleton />
                        ) : isError || !data ? (
                            <ViewerTocSkeleton />
                        ) : (
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
                                onEditorView={() => navigate(`/editor/${syllabus!.id}`)}
                            />
                        )}
                    </aside>
                </div>
            </div>
        </SidebarProvider>
    )
}

// ── Loading / shell helpers ───────────────────────────────────────────────────

function ViewerHeader({
    loading,
    courseCode,
    termCode,
    section,
    institutionName,
}: {
    loading: boolean
    courseCode?: string
    termCode?: string
    section?: ViewerSection
    institutionName?: string | null
}) {
    return (
        <div className="shrink-0 bg-primary text-primary-foreground px-8 py-5">
            <h1 className="text-xl font-bold leading-tight">
                {loading ? (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{courseCode ?? '—'}</span>
                        <span>-</span>
                        <Skeleton className="h-6 w-48 max-w-full bg-primary-foreground/25" />
                        <span>-</span>
                        <span>{termCode ?? '—'}</span>
                    </span>
                ) : (
                    <>
                        {section!.courseCode} - {section!.courseName} - {section!.termName}
                    </>
                )}
            </h1>
            {loading ? (
                <Skeleton className="h-4 w-40 mt-2 bg-primary-foreground/20" />
            ) : institutionName ? (
                <p className="text-sm text-primary-foreground/70 mt-1">{institutionName}</p>
            ) : null}
        </div>
    )
}

function ViewerContentSkeleton() {
    return (
        <div className="space-y-10" aria-busy="true" aria-label="Loading syllabus content">
            {[0, 1, 2].map(i => (
                <div key={i} className="space-y-4">
                    <Skeleton className="h-7 w-2/3 max-w-md" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    {i === 0 && <Skeleton className="h-16 w-full" />}
                </div>
            ))}
        </div>
    )
}

function ViewerTocSkeleton() {
    const rowWidths = ['w-full', 'w-5/6', 'w-4/5', 'w-full', 'w-3/4', 'w-5/6']
    return (
        <div className="text-sm space-y-4" aria-busy="true" aria-label="Loading table of contents">
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Instructor
                </p>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-4/5" />
            </div>
            <Separator />
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Contents
                </p>
                <div className="space-y-2 mt-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    {rowWidths.map((w, i) => (
                        <Skeleton
                            key={i}
                            className={cn('h-3', w, i % 3 === 1 && 'ml-3', i % 3 === 2 && 'ml-6')}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

function ViewerErrorMessage({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <p className="text-lg font-semibold mb-2">Unable to load syllabus</p>
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
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
        <div className="space-y-3">
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
                    <section key={seg.id} id={seg.id} className="space-y-3">
                        <HeadingTag className={cn(
                            'font-bold bg-card text-card-foreground p-8 shadow-2xl',
                            seg.printHeading === 2 && 'text-2xl',
                            seg.printHeading === 3 && 'text-xl',
                            seg.printHeading === 4 && 'text-lg',
                            seg.printHeading >= 5 && 'text-base',
                        )}>
                            {seg.name}
                        </HeadingTag>

                        <div className="space-y-3">
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
                                    <div
                                        key={item.id}
                                        id={item.id}
                                        className="bg-card text-card-foreground border-l-solid border-l-sidebar-foreground shadow-2xl"
                                        style={{ borderLeftWidth: `${(seg.printHeading * 14) - 14}px` }}
                                    >
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
                        <p className="text-xs text-muted-foreground font-medium mb-1">Office Hours</p>
                        <div
                            className="prose prose-sm max-w-none text-xs text-foreground [&_*]:text-xs [&_p]:my-0.5"
                            dangerouslySetInnerHTML={{ __html: syllabus.officeHours }}
                        />
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
                        <div className="space-y-1">
                            {syllabus.interactiveView && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex gap-3 w-full justify-start text-sm font-normal px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    onClick={onInteractiveView}
                                >
                                    <Presentation className="h-4 w-4 shrink-0" />Interactive View
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex gap-3 w-full justify-start text-sm font-normal px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                onClick={onCompleteView}
                            >
                                <FileText className="h-4 w-4 shrink-0" />Complete View
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex gap-3 w-full justify-start text-sm font-normal px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                onClick={onEditorView}
                            >
                                <Pencil className="h-4 w-4 shrink-0" />Editor View
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex gap-3 w-full justify-start text-sm font-normal px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                disabled
                            >
                                <ChartBar className="h-4 w-4 shrink-0" />Student Progress
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
                            variant="ghost"
                            size="sm"
                            className="flex gap-3 w-full justify-start text-sm font-normal px-2 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            onClick={() => window.print()}
                        >
                            <Printer className="h-4 w-4 shrink-0" />Print
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
