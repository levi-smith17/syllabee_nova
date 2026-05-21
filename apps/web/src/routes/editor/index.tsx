import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'
import type { MasterSyllabus, SyllabusDetail, GradingScale, BlockType, EditorSection } from '@syllabee/types'
import type { Col1Mode, Col2Mode, Col3Mode } from './shared'
import { SyllabusColumn } from './syllabi'
import { SegmentColumn } from './segments'
import { BlockColumn } from './blocks'

function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState(() => window.matchMedia('(max-width: 767px)').matches)
    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)')
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])
    return isMobile
}

export default function EditorPage() {
    const { id } = useParams<{ id?: string }>()
    const navigate = useNavigate()
    const qc = useQueryClient()
    const isMobile = useIsMobile()

    // ── Column modes ──────────────────────────────────────────────────────────
    const [col1Mode, setCol1Mode] = React.useState<Col1Mode>('list')
    const [col2Mode, setCol2Mode] = React.useState<Col2Mode>('hidden')
    const [col3Mode, setCol3Mode] = React.useState<Col3Mode>('blocks')

    // ── Selection state ───────────────────────────────────────────────────────
    const [editingSegmentId, setEditingSegmentId] = React.useState<string | null>(null)
    const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | null>(null)
    const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
    const [newBlockType, setNewBlockType] = React.useState<BlockType | null>(null)
    const [editingSyllabusId, setEditingSyllabusId] = React.useState<string | null>(null)

    // Track id changes (no remount when navigating between syllabi)
    const prevIdRef = React.useRef<string | undefined>(id)

    React.useEffect(() => {
        if (prevIdRef.current === id) return
        prevIdRef.current = id
        setCol1Mode('list')
        setEditingSyllabusId(null)
        // Close col2 only if we navigated away from all syllabi; otherwise reset
        // to the list view (keeps col2 open if user was browsing segments)
        setCol2Mode(prev => {
            if (!id) return 'hidden'
            return prev === 'hidden' ? 'hidden' : 'segmentList'
        })
        setEditingSegmentId(null)
        setSelectedSegmentId(null)
        setSelectedBlockId(null)
        setCol3Mode('blocks')
        setNewBlockType(null)
    }, [id])

    // ── Queries ───────────────────────────────────────────────────────────────

    const { data: syllabi = [], isLoading: syllabiLoading } = useQuery({
        queryKey: ['syllabi'],
        queryFn: () => apiFetch<{ data: MasterSyllabus[] }>('/editor/syllabi').then(r => r.data ?? []),
    })

    const { data: terms = [] } = useQuery({
        queryKey: ['terms'],
        queryFn: () => apiFetch<{ data: { id: string; name: string; code: string; isActive?: boolean }[] }>('/registration/terms').then(r => r.data ?? []),
    })

    const { data: syllabusData, isLoading: detailLoading } = useQuery({
        queryKey: ['syllabus', id],
        queryFn: () => apiFetch<{ data: SyllabusDetail }>(`/editor/syllabi/${id}`).then(r => r.data),
        enabled: !!id,
    })

    const { data: gradingScales = [] } = useQuery({
        queryKey: ['grading-scales'],
        queryFn: () => apiFetch<{ data: GradingScale[] }>('/editor/grading-scales').then(r => r.data ?? []),
        enabled: !!id,
    })

    const { data: allSections = [] } = useQuery({
        queryKey: ['sections'],
        queryFn: () => apiFetch<{ data: EditorSection[] }>('/editor/sections').then(r => r.data ?? []),
        staleTime: 1000 * 60 * 30,
    })

    const syllabus = syllabusData?.syllabus
    const segments = syllabusData?.segments ?? []
    const locked = syllabus?.locked ?? false
    const selectedSegment = segments.find(s => s.id === selectedSegmentId)

    const editingSyllabus = syllabi.find(s => s.id === editingSyllabusId)
    const editingLocked = editingSyllabus?.locked ?? false

    function invalidate() { void qc.invalidateQueries({ queryKey: ['syllabus', id] }) }

    // ── Mutations: Syllabi ────────────────────────────────────────────────────

    const createSyllabusMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) =>
            apiFetch<{ data: { id: string } }>('/editor/syllabi', { method: 'POST', body: JSON.stringify(body) }),
        onSuccess: res => {
            void qc.invalidateQueries({ queryKey: ['syllabi'] })
            toast.success('Syllabus created')
            navigate(`/editor/${res.data.id}`)
            setCol2Mode('segmentList')
        },
        onError: () => toast.error('Failed to create syllabus'),
    })

    const updateSyllabusMutation = useMutation({
        mutationFn: ({ syllabusId, body }: { syllabusId: string; body: Record<string, unknown> }) =>
            apiFetch(`/editor/syllabi/${syllabusId}`, { method: 'PUT', body: JSON.stringify(body) }),
        onSuccess: (_, { syllabusId }) => {
            void qc.invalidateQueries({ queryKey: ['syllabus', syllabusId] })
            void qc.invalidateQueries({ queryKey: ['syllabi'] })
            toast.success('Syllabus saved')
            setEditingSyllabusId(null)
            setCol1Mode('list')
        },
        onError: () => toast.error('Failed to save syllabus'),
    })

    const deleteSyllabusMutation = useMutation({
        mutationFn: (syllabusId: string) => apiFetch(`/editor/syllabi/${syllabusId}`, { method: 'DELETE' }),
        onSuccess: (_, syllabusId) => {
            void qc.invalidateQueries({ queryKey: ['syllabi'] })
            toast.success('Syllabus deleted')
            if (syllabusId === id) navigate('/editor')
        },
        onError: () => toast.error('Failed to delete'),
    })

    const lockMutation = useMutation({
        mutationFn: ({ syllabusId, locked: l }: { syllabusId: string; locked: boolean }) =>
            apiFetch(`/editor/syllabi/${syllabusId}/lock`, { method: 'POST', body: JSON.stringify({ locked: l }) }),
        onSuccess: (_, { syllabusId, locked: l }) => {
            void qc.invalidateQueries({ queryKey: ['syllabi'] })
            void qc.invalidateQueries({ queryKey: ['syllabus', syllabusId] })
            toast.success(l ? 'Locked' : 'Unlocked')
        },
        onError: () => toast.error('Failed to update lock'),
    })

    // ── Mutations: Segments ───────────────────────────────────────────────────

    const addSegmentMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) =>
            apiFetch<{ data: { id: string } }>(`/editor/syllabi/${id}/segments`, { method: 'POST', body: JSON.stringify(body) }),
        onSuccess: res => {
            invalidate()
            toast.success('Segment added')
            setCol2Mode('segmentList')
            setSelectedSegmentId(res.data.id)
            setCol3Mode('blocks')
        },
        onError: () => toast.error('Failed to add segment'),
    })

    const updateSegmentMutation = useMutation({
        mutationFn: ({ segId, body }: { segId: string; body: Record<string, unknown> }) =>
            apiFetch(`/editor/syllabi/${id}/segments/${segId}`, { method: 'PUT', body: JSON.stringify(body) }),
        onSuccess: () => { invalidate(); toast.success('Segment saved'); setCol2Mode('segmentList') },
        onError: () => toast.error('Failed to save segment'),
    })

    const deleteSegmentMutation = useMutation({
        mutationFn: (segId: string) => apiFetch(`/editor/syllabi/${id}/segments/${segId}`, { method: 'DELETE' }),
        onSuccess: (_, segId) => {
            invalidate()
            toast.success('Segment deleted')
            setCol2Mode('segmentList')
            setEditingSegmentId(null)
            if (selectedSegmentId === segId) {
                setSelectedSegmentId(null)
                setCol3Mode('blocks')
            }
        },
        onError: () => toast.error('Failed to delete segment'),
    })

    const reorderSegmentsMutation = useMutation({
        mutationFn: (orderedIds: string[]) =>
            apiFetch(`/editor/syllabi/${id}/segments/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds }) }),
        onMutate: async (orderedIds) => {
            await qc.cancelQueries({ queryKey: ['syllabus', id] })
            const previous = qc.getQueryData<SyllabusDetail>(['syllabus', id])
            qc.setQueryData<SyllabusDetail>(['syllabus', id], old => {
                if (!old) return old
                const byId = new Map(old.segments.map(s => [s.id, s]))
                return { ...old, segments: orderedIds.map((sid, idx) => ({ ...byId.get(sid)!, sortOrder: idx })) }
            })
            return { previous }
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) qc.setQueryData(['syllabus', id], context.previous)
            toast.error('Failed to reorder')
        },
        onSettled: () => void qc.invalidateQueries({ queryKey: ['syllabus', id] }),
    })

    // ── Mutations: Blocks ─────────────────────────────────────────────────────

    const addBlockMutation = useMutation({
        mutationFn: ({ segId, body }: { segId: string; body: Record<string, unknown> }) =>
            apiFetch<{ data: { id: string } }>(`/editor/syllabi/${id}/segments/${segId}/blocks`, { method: 'POST', body: JSON.stringify(body) }),
        onSuccess: res => {
            invalidate()
            toast.success('Block added')
            setSelectedBlockId(res.data.id)
            setNewBlockType(null)
            setCol3Mode('editBlock')
        },
        onError: () => toast.error('Failed to add block'),
    })

    const updateBlockMutation = useMutation({
        mutationFn: ({ segId, blockId, body }: { segId: string; blockId: string; body: Record<string, unknown> }) =>
            apiFetch(`/editor/syllabi/${id}/segments/${segId}/blocks/${blockId}`, { method: 'PUT', body: JSON.stringify(body) }),
        onSuccess: () => { invalidate(); toast.success('Block saved') },
        onError: () => toast.error('Failed to save block'),
    })

    const deleteBlockMutation = useMutation({
        mutationFn: ({ segId, blockId }: { segId: string; blockId: string }) =>
            apiFetch(`/editor/syllabi/${id}/segments/${segId}/blocks/${blockId}`, { method: 'DELETE' }),
        onSuccess: () => {
            invalidate()
            toast.success('Block deleted')
            setSelectedBlockId(null)
            setCol3Mode('blocks')
        },
        onError: () => toast.error('Failed to delete block'),
    })

    const copySegmentMutation = useMutation({
        mutationFn: ({ sourceSyllabusId, sourceSegmentId, sections }: {
            sourceSyllabusId: string; sourceSegmentId: string; sections: string[]
        }) =>
            apiFetch<{ data: { id: string } }>(`/editor/syllabi/${id}/segments/copy`, {
                method: 'POST',
                body: JSON.stringify({ sourceSyllabusId, sourceSegmentId, sections }),
            }),
        onSuccess: res => {
            invalidate()
            void qc.invalidateQueries({ queryKey: ['syllabi'] })
            toast.success('Segment copied')
            setSelectedSegmentId(res.data.id)
            setCol3Mode('blocks')
        },
        onError: () => toast.error('Failed to copy segment'),
    })

    const copyBlockMutation = useMutation({
        mutationFn: ({ segId, sourceSyllabusId, sourceSegmentId, sourceBlockId }: {
            segId: string; sourceSyllabusId: string; sourceSegmentId: string; sourceBlockId: string
        }) =>
            apiFetch<{ data: { id: string } }>(`/editor/syllabi/${id}/segments/${segId}/blocks/copy`, {
                method: 'POST',
                body: JSON.stringify({ sourceSyllabusId, sourceSegmentId, sourceBlockId }),
            }),
        onSuccess: res => {
            invalidate()
            toast.success('Block copied')
            setSelectedBlockId(res.data.id)
            setCol3Mode('editBlock')
        },
        onError: () => toast.error('Failed to copy block'),
    })

    const reorderBlocksMutation = useMutation({
        mutationFn: ({ segId, orderedIds }: { segId: string; orderedIds: string[] }) =>
            apiFetch(`/editor/syllabi/${id}/segments/${segId}/blocks/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds }) }),
        onMutate: async ({ segId, orderedIds }) => {
            await qc.cancelQueries({ queryKey: ['syllabus', id] })
            const previous = qc.getQueryData<SyllabusDetail>(['syllabus', id])
            qc.setQueryData<SyllabusDetail>(['syllabus', id], old => {
                if (!old) return old
                return {
                    ...old,
                    segments: old.segments.map(seg => {
                        if (seg.id !== segId) return seg
                        const byId = new Map(seg.blocks.map(b => [b.id, b]))
                        return { ...seg, blocks: orderedIds.map((bid, idx) => ({ ...byId.get(bid)!, sortOrder: idx })) }
                    }),
                }
            })
            return { previous }
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) qc.setQueryData(['syllabus', id], context.previous)
            toast.error('Failed to reorder')
        },
        onSettled: () => void qc.invalidateQueries({ queryKey: ['syllabus', id] }),
    })

    // ── Handlers ──────────────────────────────────────────────────────────────

    function handleSelectSyllabus(newId: string) {
        if (newId === id) {
            if (isMobile) {
                // On mobile, clicking same syllabus always shows segments
                setCol2Mode('segmentList')
                setSelectedSegmentId(null)
                setSelectedBlockId(null)
                setCol3Mode('blocks')
            } else if (col2Mode !== 'hidden') {
                // Desktop: deselect entirely — navigate clears URL, useEffect resets state
                navigate('/editor')
            } else {
                setCol2Mode('segmentList')
            }
        } else {
            setCol2Mode('segmentList')
            navigate(`/editor/${newId}`)
        }
    }

    function handleEditSyllabus(syllabusId: string) {
        setEditingSyllabusId(syllabusId)
        setCol1Mode('edit')
    }

    // ── Render ────────────────────────────────────────────────────────────────

    const showCol2 = col2Mode !== 'hidden'
    const showCol3 = showCol2 && !!selectedSegmentId && !!selectedSegment
    const mobileActiveCol = showCol3 ? 'col3' : showCol2 ? 'col2' : 'col1'

    return (
        <div className="flex h-full overflow-hidden">

            {(!isMobile || mobileActiveCol === 'col1') && <SyllabusColumn
                syllabi={syllabi}
                syllabiLoading={syllabiLoading}
                selectedId={id}
                col1Mode={col1Mode}
                setCol1Mode={m => { if (m === 'list') setEditingSyllabusId(null); setCol1Mode(m) }}
                terms={terms}
                syllabus={editingSyllabus}
                locked={editingLocked}
                onSelectSyllabus={handleSelectSyllabus}
                onEditSyllabus={handleEditSyllabus}
                onCreateSyllabus={body => createSyllabusMutation.mutate(body)}
                onUpdateSyllabus={body => updateSyllabusMutation.mutate({ syllabusId: editingSyllabusId!, body })}
                onDeleteSyllabus={syllabusId => deleteSyllabusMutation.mutate(syllabusId)}
                onToggleLock={syllabusId => {
                    const syl = syllabi.find(s => s.id === syllabusId)
                    if (syl) lockMutation.mutate({ syllabusId, locked: !syl.locked })
                }}
                isCreating={createSyllabusMutation.isPending}
                isUpdating={updateSyllabusMutation.isPending}
            />}

            {showCol2 && (!isMobile || mobileActiveCol === 'col2') && (
                <SegmentColumn
                    syllabus={syllabus}
                    segments={segments}
                    detailLoading={detailLoading}
                    locked={locked}
                    col2Mode={col2Mode}
                    setCol2Mode={setCol2Mode}
                    editingSegmentId={editingSegmentId}
                    setEditingSegmentId={setEditingSegmentId}
                    selectedSegmentId={selectedSegmentId}
                    onSelectSegment={segId => {
                        if (segId === selectedSegmentId && !isMobile) {
                            setSelectedSegmentId(null)
                            setSelectedBlockId(null)
                            setCol3Mode('blocks')
                        } else {
                            setSelectedSegmentId(segId)
                            setSelectedBlockId(null)
                            setCol3Mode('blocks')
                        }
                    }}
                    onAddSegment={body => addSegmentMutation.mutate(body)}
                    onUpdateSegment={(segId, body) => updateSegmentMutation.mutate({ segId, body })}
                    onDeleteSegment={segId => deleteSegmentMutation.mutate(segId)}
                    onReorderSegments={orderedIds => reorderSegmentsMutation.mutate(orderedIds)}
                    onEditSettings={() => { setEditingSyllabusId(id ?? null); setCol1Mode('edit') }}
                    isAdding={addSegmentMutation.isPending}
                    isUpdating={updateSegmentMutation.isPending}
                    syllabi={syllabi}
                    allSections={allSections}
                    onCopySegment={(sourceSyllabusId, sourceSegmentId, sections) =>
                        copySegmentMutation.mutate({ sourceSyllabusId, sourceSegmentId, sections })
                    }
                    isCopyingSegment={copySegmentMutation.isPending}
                    mobileBack={isMobile ? () => {
                        setCol2Mode('hidden')
                        setSelectedSegmentId(null)
                        setSelectedBlockId(null)
                        setCol3Mode('blocks')
                    } : undefined}
                />
            )}

            {showCol3 && selectedSegment && (!isMobile || mobileActiveCol === 'col3') && (
                <BlockColumn
                    selectedSegment={selectedSegment}
                    locked={locked}
                    col3Mode={col3Mode}
                    setCol3Mode={setCol3Mode}
                    selectedBlockId={selectedBlockId}
                    setSelectedBlockId={setSelectedBlockId}
                    newBlockType={newBlockType}
                    setNewBlockType={setNewBlockType}
                    gradingScales={gradingScales}
                    onAddBlock={(segId, body) => addBlockMutation.mutate({ segId, body })}
                    onUpdateBlock={(segId, blockId, body) => updateBlockMutation.mutate({ segId, blockId, body })}
                    onDeleteBlock={(segId, blockId) => deleteBlockMutation.mutate({ segId, blockId })}
                    onToggleBlockVisible={(segId, blockId) => {
                        const block = selectedSegment.blocks.find(b => b.id === blockId)
                        if (block && !locked) updateBlockMutation.mutate({ segId, blockId, body: { isVisible: !block.isVisible } })
                    }}
                    onReorderBlocks={(segId, orderedIds) => reorderBlocksMutation.mutate({ segId, orderedIds })}
                    isAdding={addBlockMutation.isPending}
                    isUpdating={updateBlockMutation.isPending}
                    syllabi={syllabi}
                    onCopyBlock={(sourceSyllabusId, sourceSegmentId, sourceBlockId) =>
                        copyBlockMutation.mutate({ segId: selectedSegmentId!, sourceSyllabusId, sourceSegmentId, sourceBlockId })
                    }
                    isCopyingBlock={copyBlockMutation.isPending}
                    mobileBack={isMobile ? () => {
                        setSelectedSegmentId(null)
                        setSelectedBlockId(null)
                        setCol3Mode('blocks')
                    } : undefined}
                />
            )}

        </div>
    )
}
