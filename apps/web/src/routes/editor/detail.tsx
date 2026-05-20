import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    ArrowLeft, Settings, Lock, Unlock, Eye, EyeOff,
    ChevronDown, ChevronRight, Plus, Trash2, GripVertical,
    ChevronUp, Type, AlignLeft, Video, List, Table2,
    BarChart3, FileText, MessageSquare, Calendar, Paperclip,
} from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import type { SyllabusDetail, SyllabusSegment, SyllabusBlock, BlockType, GradingScale } from '@syllabee/types'

// ── Types ─────────────────────────────────────────────────

type RightPanel = 'none' | 'settings' | 'segment' | 'block-add' | 'block-edit'

const BLOCK_TYPE_META: Record<BlockType, { label: string; Icon: React.ElementType }> = {
    content_block:           { label: 'Content',          Icon: Type },
    details_block:           { label: 'Details',          Icon: AlignLeft },
    video_block:             { label: 'Video',             Icon: Video },
    list_block:              { label: 'List',              Icon: List },
    table_block:             { label: 'Table',             Icon: Table2 },
    grade_determination_block: { label: 'Grade Determination', Icon: BarChart3 },
    file_block:              { label: 'Files',             Icon: Paperclip },
    response_block:          { label: 'Response',         Icon: MessageSquare },
    schedule_block:          { label: 'Schedule',         Icon: Calendar },
}

// ── Block content helpers ─────────────────────────────────

function newContent(type: BlockType): Record<string, unknown> {
    switch (type) {
        case 'content_block':           return { html: '' }
        case 'details_block':           return { summary: '', html: '' }
        case 'video_block':             return { url: '', caption: '' }
        case 'list_block':              return { style: 'bullet', items: [] }
        case 'table_block':             return { rows: [{ id: uid(), cells: [{ value: '' }] }] }
        case 'grade_determination_block': return { rows: [], gradingScaleId: '' }
        case 'file_block':              return { attachments: [] }
        case 'response_block':          return { questions: [] }
        case 'schedule_block':          return { units: [] }
        default:                        return {}
    }
}

function uid() { return Math.random().toString(36).slice(2) }

// ── Main component ────────────────────────────────────────

export default function EditorDetailPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const qc = useQueryClient()

    const [rightPanel, setRightPanel] = React.useState<RightPanel>('none')
    const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | null>(null)
    const [selectedBlockId, setSelectedBlockId] = React.useState<string | null>(null)
    const [expandedSegments, setExpandedSegments] = React.useState<Set<string>>(new Set())
    const [confirmDelete, setConfirmDelete] = React.useState<'syllabus' | 'block' | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['syllabus', id],
        queryFn: () => apiFetch<{ data: SyllabusDetail }>(`/editor/syllabi/${id}`).then(r => r.data),
        enabled: !!id,
    })

    const { data: gradingScales = [] } = useQuery({
        queryKey: ['grading-scales'],
        queryFn: () => apiFetch<{ data: GradingScale[] }>('/editor/grading-scales').then(r => r.data ?? []),
    })

    const syllabus = data?.syllabus
    const segments = data?.segments ?? []
    const locked = syllabus?.locked ?? false

    const selectedSegment = segments.find(s => s.id === selectedSegmentId)
    const selectedBlock = selectedSegment?.blocks.find(b => b.id === selectedBlockId)

    function invalidate() { qc.invalidateQueries({ queryKey: ['syllabus', id] }) }

    // ── Mutations ─────────────────────────────────────────

    const lockMutation = useMutation({
        mutationFn: (l: boolean) => apiFetch(`/editor/syllabi/${id}/lock`, { method: 'POST', body: JSON.stringify({ locked: l }) }),
        onSuccess: () => { invalidate(); toast.success(locked ? 'Syllabus unlocked' : 'Syllabus locked') },
        onError: () => toast.error('Failed to update lock'),
    })

    const updateSyllabusMutation = useMutation({
        mutationFn: (body: Record<string, unknown>) => apiFetch(`/editor/syllabi/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        onSuccess: () => { invalidate(); toast.success('Settings saved') },
        onError: () => toast.error('Failed to save settings'),
    })

    const deleteSyllabusMutation = useMutation({
        mutationFn: () => apiFetch(`/editor/syllabi/${id}`, { method: 'DELETE' }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['syllabi'] }); toast.success('Syllabus deleted'); navigate('/editor') },
        onError: () => toast.error('Failed to delete syllabus'),
    })

    const addSegmentMutation = useMutation({
        mutationFn: (name: string) => apiFetch<{ data: { id: string } }>(`/editor/syllabi/${id}/segments`, { method: 'POST', body: JSON.stringify({ name }) }),
        onSuccess: (res) => { invalidate(); setSelectedSegmentId(res.data.id); setRightPanel('segment') },
        onError: () => toast.error('Failed to add segment'),
    })

    const updateSegmentMutation = useMutation({
        mutationFn: ({ segId, body }: { segId: string; body: Record<string, unknown> }) =>
            apiFetch(`/editor/syllabi/${id}/segments/${segId}`, { method: 'PUT', body: JSON.stringify(body) }),
        onSuccess: () => { invalidate(); toast.success('Segment saved') },
        onError: () => toast.error('Failed to save segment'),
    })

    const deleteSegmentMutation = useMutation({
        mutationFn: (segId: string) => apiFetch(`/editor/syllabi/${id}/segments/${segId}`, { method: 'DELETE' }),
        onSuccess: () => { invalidate(); setRightPanel('none'); setSelectedSegmentId(null); toast.success('Segment deleted') },
        onError: () => toast.error('Failed to delete segment'),
    })

    const reorderSegmentsMutation = useMutation({
        mutationFn: (orderedIds: string[]) => apiFetch(`/editor/syllabi/${id}/segments/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds }) }),
        onSuccess: invalidate,
        onError: () => toast.error('Failed to reorder segments'),
    })

    const addBlockMutation = useMutation({
        mutationFn: ({ segId, type, name }: { segId: string; type: BlockType; name: string }) =>
            apiFetch<{ data: { id: string } }>(`/editor/syllabi/${id}/segments/${segId}/blocks`, {
                method: 'POST',
                body: JSON.stringify({ type, name, content: newContent(type) }),
            }),
        onSuccess: (res, vars) => {
            invalidate()
            setSelectedBlockId(res.data.id)
            setSelectedSegmentId(vars.segId)
            setRightPanel('block-edit')
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
        onSuccess: () => { invalidate(); setRightPanel('none'); setSelectedBlockId(null); toast.success('Block deleted') },
        onError: () => toast.error('Failed to delete block'),
    })

    const reorderBlocksMutation = useMutation({
        mutationFn: ({ segId, orderedIds }: { segId: string; orderedIds: string[] }) =>
            apiFetch(`/editor/syllabi/${id}/segments/${segId}/blocks/reorder`, { method: 'POST', body: JSON.stringify({ orderedIds }) }),
        onSuccess: invalidate,
        onError: () => toast.error('Failed to reorder blocks'),
    })

    // ── Sidebar helpers ────────────────────────────────────

    function toggleExpand(segId: string) {
        setExpandedSegments(prev => {
            const next = new Set(prev)
            next.has(segId) ? next.delete(segId) : next.add(segId)
            return next
        })
    }

    function moveSegment(segId: string, direction: -1 | 1) {
        const sorted = [...segments].sort((a, b) => a.sortOrder - b.sortOrder)
        const idx = sorted.findIndex(s => s.id === segId)
        if (idx === -1) return
        const newIdx = idx + direction
        if (newIdx < 0 || newIdx >= sorted.length) return
        const newOrder = sorted.map(s => s.id)
        newOrder.splice(idx, 1)
        newOrder.splice(newIdx, 0, segId)
        reorderSegmentsMutation.mutate(newOrder)
    }

    function moveBlock(segId: string, blockId: string, direction: -1 | 1) {
        const seg = segments.find(s => s.id === segId)
        if (!seg) return
        const sorted = [...seg.blocks].sort((a, b) => a.sortOrder - b.sortOrder)
        const idx = sorted.findIndex(b => b.id === blockId)
        if (idx === -1) return
        const newIdx = idx + direction
        if (newIdx < 0 || newIdx >= sorted.length) return
        const newOrder = sorted.map(b => b.id)
        newOrder.splice(idx, 1)
        newOrder.splice(newIdx, 0, blockId)
        reorderBlocksMutation.mutate({ segId, orderedIds: newOrder })
    }

    // ── Loading / error ────────────────────────────────────

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>
    }
    if (!syllabus) {
        return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Syllabus not found.</div>
    }

    const sortedSegments = [...segments].sort((a, b) => a.sortOrder - b.sortOrder)

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Left Sidebar ─────────────────────────────── */}
            <div className="w-72 border-r flex flex-col overflow-hidden shrink-0">
                {/* Sidebar header */}
                <div className="flex items-center gap-1 px-2 py-2 border-b">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/editor')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex-1 text-sm font-medium truncate">{syllabus.title}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => lockMutation.mutate(!locked)}
                        title={locked ? 'Unlock' : 'Lock'}
                    >
                        {locked ? <Lock className="h-4 w-4 text-amber-500" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRightPanel('settings')}
                        title="Settings"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>

                {/* Lock badge */}
                <div className="px-3 py-1.5 border-b bg-muted/30">
                    {locked
                        ? <Badge variant="secondary" className="text-xs gap-1"><Lock className="h-3 w-3" />LOCKED</Badge>
                        : <Badge variant="outline" className="text-xs">DRAFT</Badge>
                    }
                </div>

                {/* Segment tree */}
                <div className="flex-1 overflow-y-auto">
                    {sortedSegments.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-4">No segments yet.</p>
                    ) : sortedSegments.map((seg, segIdx) => {
                        const isExpanded = expandedSegments.has(seg.id)
                        const isSelectedSeg = selectedSegmentId === seg.id
                        const sortedBlocks = [...seg.blocks].sort((a, b) => a.sortOrder - b.sortOrder)

                        return (
                            <div key={seg.id}>
                                <div
                                    className={`flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors ${isSelectedSeg && rightPanel === 'segment' ? 'bg-muted' : ''}`}
                                    onClick={() => { setSelectedSegmentId(seg.id); setRightPanel('segment') }}
                                >
                                    <button
                                        className="p-0.5 rounded hover:bg-muted"
                                        onClick={e => { e.stopPropagation(); toggleExpand(seg.id) }}
                                    >
                                        {isExpanded
                                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        }
                                    </button>
                                    <span className="flex-1 text-sm truncate">{seg.name}</span>
                                    <button
                                        className="p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100"
                                        title="Toggle visibility"
                                        onClick={e => { e.stopPropagation(); if (!locked) updateSegmentMutation.mutate({ segId: seg.id, body: { isVisible: !seg.isVisible } }) }}
                                    >
                                        {seg.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                    </button>
                                    <button
                                        className="p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100 disabled:opacity-30"
                                        disabled={segIdx === 0 || locked}
                                        onClick={e => { e.stopPropagation(); moveSegment(seg.id, -1) }}
                                    >
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        className="p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100 disabled:opacity-30"
                                        disabled={segIdx === sortedSegments.length - 1 || locked}
                                        onClick={e => { e.stopPropagation(); moveSegment(seg.id, 1) }}
                                    >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {isExpanded && sortedBlocks.map((block, blkIdx) => {
                                    const { Icon } = BLOCK_TYPE_META[block.type] ?? { Icon: FileText }
                                    const isSelectedBlk = selectedBlockId === block.id
                                    return (
                                        <div
                                            key={block.id}
                                            className={`flex items-center gap-1 pl-7 pr-2 py-1 cursor-pointer hover:bg-muted/50 transition-colors ${isSelectedBlk && rightPanel === 'block-edit' ? 'bg-muted' : ''}`}
                                            onClick={() => { setSelectedSegmentId(seg.id); setSelectedBlockId(block.id); setRightPanel('block-edit') }}
                                        >
                                            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="flex-1 text-xs truncate">{block.name}</span>
                                            <button
                                                className="p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100"
                                                onClick={e => { e.stopPropagation(); if (!locked) updateBlockMutation.mutate({ segId: seg.id, blockId: block.id, body: { isVisible: !block.isVisible } }) }}
                                            >
                                                {block.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                            </button>
                                            <button
                                                className="p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100 disabled:opacity-30"
                                                disabled={blkIdx === 0 || locked}
                                                onClick={e => { e.stopPropagation(); moveBlock(seg.id, block.id, -1) }}
                                            >
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button
                                                className="p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100 disabled:opacity-30"
                                                disabled={blkIdx === sortedBlocks.length - 1 || locked}
                                                onClick={e => { e.stopPropagation(); moveBlock(seg.id, block.id, 1) }}
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>

                {/* Sidebar footer */}
                {!locked && (
                    <div className="border-t p-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => addSegmentMutation.mutate('New Segment')}
                            disabled={addSegmentMutation.isPending}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Segment
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Right Panel ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                {rightPanel === 'none' && (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        Select a segment or block to edit
                    </div>
                )}

                {rightPanel === 'settings' && syllabus && (
                    <SettingsPanel
                        syllabus={syllabus}
                        locked={locked}
                        onSave={body => updateSyllabusMutation.mutate(body)}
                        onLock={() => lockMutation.mutate(!locked)}
                        onDelete={() => setConfirmDelete('syllabus')}
                        isSaving={updateSyllabusMutation.isPending}
                    />
                )}

                {rightPanel === 'segment' && selectedSegment && (
                    <SegmentPanel
                        segment={selectedSegment}
                        locked={locked}
                        onSave={body => updateSegmentMutation.mutate({ segId: selectedSegment.id, body })}
                        onDelete={() => deleteSegmentMutation.mutate(selectedSegment.id)}
                        onAddBlock={() => setRightPanel('block-add')}
                        onEditBlock={(blockId) => { setSelectedBlockId(blockId); setRightPanel('block-edit') }}
                        isSaving={updateSegmentMutation.isPending}
                    />
                )}

                {rightPanel === 'block-add' && selectedSegmentId && !locked && (
                    <BlockPickerPanel
                        onPick={type => addBlockMutation.mutate({
                            segId: selectedSegmentId,
                            type,
                            name: BLOCK_TYPE_META[type].label,
                        })}
                        isPending={addBlockMutation.isPending}
                    />
                )}

                {rightPanel === 'block-edit' && selectedSegment && selectedBlock && (
                    <BlockEditorPanel
                        block={selectedBlock}
                        segmentId={selectedSegment.id}
                        locked={locked}
                        gradingScales={gradingScales}
                        onSave={body => updateBlockMutation.mutate({ segId: selectedSegment.id, blockId: selectedBlock.id, body })}
                        onDelete={() => setConfirmDelete('block')}
                        isSaving={updateBlockMutation.isPending}
                    />
                )}
            </div>

            {/* ── Confirm Delete Dialog ─────────────────────── */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-background rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-semibold mb-2">
                            Delete {confirmDelete === 'syllabus' ? 'Syllabus' : 'Block'}?
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {confirmDelete === 'syllabus'
                                ? 'This will permanently delete the syllabus and all its segments and blocks.'
                                : 'This will permanently delete this block.'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setConfirmDelete(null)
                                    if (confirmDelete === 'syllabus') deleteSyllabusMutation.mutate()
                                    else if (selectedSegment && selectedBlock) deleteBlockMutation.mutate({ segId: selectedSegment.id, blockId: selectedBlock.id })
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Settings Panel ────────────────────────────────────────

function SettingsPanel({
    syllabus, locked, onSave, onLock, onDelete, isSaving,
}: {
    syllabus: SyllabusDetail['syllabus']
    locked: boolean
    onSave: (body: Record<string, unknown>) => void
    onLock: () => void
    onDelete: () => void
    isSaving: boolean
}) {
    const [form, setForm] = React.useState({
        title: syllabus.title,
        termCode: syllabus.termCode ?? '',
        officeHours: syllabus.officeHours ?? '',
        interactiveView: syllabus.interactiveView,
        timeout: syllabus.timeout,
        prohibitBacktracking: syllabus.prohibitBacktracking,
        maxAttempts: syllabus.maxAttempts,
        maxPoints: syllabus.maxPoints,
        randomizeResponses: syllabus.randomizeResponses,
        pointsLadder: syllabus.pointsLadder,
        pointsLadderDeduction: syllabus.pointsLadderDeduction,
    })

    function handleSave(e: React.FormEvent) {
        e.preventDefault()
        onSave(form)
    }

    return (
        <form onSubmit={handleSave} className="p-6 space-y-5 max-w-xl">
            <h2 className="text-base font-semibold">Syllabus Settings</h2>

            <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} disabled={locked} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
                <Label>Term Code</Label>
                <Input value={form.termCode} disabled={locked} onChange={e => setForm(f => ({ ...f, termCode: e.target.value }))} placeholder="e.g. FA24" />
            </div>
            <div className="space-y-1.5">
                <Label>Office Hours</Label>
                <Input value={form.officeHours} disabled={locked} onChange={e => setForm(f => ({ ...f, officeHours: e.target.value }))} placeholder="e.g. MWF 9–10am" />
            </div>

            <div className="flex items-center gap-3">
                <Switch
                    checked={form.interactiveView}
                    disabled={locked}
                    onCheckedChange={v => setForm(f => ({ ...f, interactiveView: v }))}
                />
                <Label>Interactive View</Label>
            </div>

            {form.interactiveView && (
                <div className="border rounded-md p-4 space-y-4 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Interactive Settings</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Timeout (minutes)</Label>
                            <Input
                                type="number" min={0} value={form.timeout} disabled={locked}
                                onChange={e => setForm(f => ({ ...f, timeout: Number(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Max Attempts</Label>
                            <Input
                                type="number" min={1} value={form.maxAttempts} disabled={locked}
                                onChange={e => setForm(f => ({ ...f, maxAttempts: Number(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Max Points</Label>
                            <Input
                                type="number" min={0} value={form.maxPoints} disabled={locked}
                                onChange={e => setForm(f => ({ ...f, maxPoints: Number(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Points Ladder Deduction (%)</Label>
                            <Input
                                type="number" min={0} max={100} value={form.pointsLadderDeduction} disabled={locked}
                                onChange={e => setForm(f => ({ ...f, pointsLadderDeduction: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={form.prohibitBacktracking} disabled={locked}
                                onCheckedChange={v => setForm(f => ({ ...f, prohibitBacktracking: !!v }))}
                            />
                            <Label>Prohibit Backtracking</Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={form.randomizeResponses} disabled={locked}
                                onCheckedChange={v => setForm(f => ({ ...f, randomizeResponses: !!v }))}
                            />
                            <Label>Randomize Responses</Label>
                        </div>
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={form.pointsLadder} disabled={locked}
                                onCheckedChange={v => setForm(f => ({ ...f, pointsLadder: !!v }))}
                            />
                            <Label>Points Ladder</Label>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
                {!locked && (
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving…' : 'Save Settings'}
                    </Button>
                )}
                <Button type="button" variant="outline" onClick={onLock}>
                    {locked ? <><Unlock className="h-4 w-4 mr-1" />Unlock Syllabus</> : <><Lock className="h-4 w-4 mr-1" />Lock Syllabus</>}
                </Button>
                {!locked && (
                    <Button type="button" variant="destructive" onClick={onDelete}>
                        <Trash2 className="h-4 w-4 mr-1" />Delete Syllabus
                    </Button>
                )}
            </div>
        </form>
    )
}

// ── Segment Panel ─────────────────────────────────────────

function SegmentPanel({
    segment, locked, onSave, onDelete, onAddBlock, onEditBlock, isSaving,
}: {
    segment: SyllabusSegment & { blocks: SyllabusBlock[] }
    locked: boolean
    onSave: (body: Record<string, unknown>) => void
    onDelete: () => void
    onAddBlock: () => void
    onEditBlock: (blockId: string) => void
    isSaving: boolean
}) {
    const [form, setForm] = React.useState({
        name: segment.name,
        description: segment.description ?? '',
        isVisible: segment.isVisible,
        printHeading: segment.printHeading,
        printingOptional: segment.printingOptional,
    })

    React.useEffect(() => {
        setForm({
            name: segment.name,
            description: segment.description ?? '',
            isVisible: segment.isVisible,
            printHeading: segment.printHeading,
            printingOptional: segment.printingOptional,
        })
    }, [segment.id])

    const sortedBlocks = [...segment.blocks].sort((a, b) => a.sortOrder - b.sortOrder)

    function handleSave(e: React.FormEvent) { e.preventDefault(); onSave(form) }

    return (
        <div className="p-6 space-y-5 max-w-xl">
            <h2 className="text-base font-semibold">Segment</h2>

            <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={form.name} disabled={locked} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={form.description} disabled={locked} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Switch checked={form.isVisible} disabled={locked} onCheckedChange={v => setForm(f => ({ ...f, isVisible: v }))} />
                        <Label>Visible</Label>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={form.printHeading} disabled={locked} onCheckedChange={v => setForm(f => ({ ...f, printHeading: v }))} />
                        <Label>Print Heading</Label>
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch checked={form.printingOptional} disabled={locked} onCheckedChange={v => setForm(f => ({ ...f, printingOptional: v }))} />
                        <Label>Printing Optional</Label>
                    </div>
                </div>
                {!locked && (
                    <div className="flex gap-2">
                        <Button type="submit" disabled={isSaving} className="flex-1">
                            {isSaving ? 'Saving…' : 'Save Segment'}
                        </Button>
                        <Button type="button" variant="destructive" size="icon" onClick={onDelete} title="Delete Segment">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </form>

            {/* Block list */}
            <div className="border-t pt-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Blocks ({sortedBlocks.length})</p>
                    {!locked && (
                        <Button size="sm" variant="outline" onClick={onAddBlock}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Block
                        </Button>
                    )}
                </div>
                {sortedBlocks.map(block => {
                    const { label, Icon } = BLOCK_TYPE_META[block.type] ?? { label: block.type, Icon: FileText }
                    return (
                        <div
                            key={block.id}
                            className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => onEditBlock(block.id)}
                        >
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{block.name}</div>
                                <div className="text-xs text-muted-foreground">{label}</div>
                            </div>
                            {!block.isVisible && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                    )
                })}
                {sortedBlocks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No blocks yet.</p>
                )}
            </div>
        </div>
    )
}

// ── Block Picker Panel ────────────────────────────────────

function BlockPickerPanel({ onPick, isPending }: { onPick: (type: BlockType) => void; isPending: boolean }) {
    return (
        <div className="p-6">
            <h2 className="text-base font-semibold mb-4">Choose Block Type</h2>
            <div className="grid grid-cols-3 gap-3">
                {(Object.entries(BLOCK_TYPE_META) as [BlockType, { label: string; Icon: React.ElementType }][]).map(([type, { label, Icon }]) => (
                    <button
                        key={type}
                        disabled={isPending}
                        onClick={() => onPick(type)}
                        className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors disabled:opacity-50 text-center"
                    >
                        <Icon className="h-6 w-6 text-primary" />
                        <span className="text-xs font-medium leading-tight">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

// ── Block Editor Panel ────────────────────────────────────

function BlockEditorPanel({
    block, segmentId, locked, gradingScales, onSave, onDelete, isSaving,
}: {
    block: SyllabusBlock
    segmentId: string
    locked: boolean
    gradingScales: GradingScale[]
    onSave: (body: Record<string, unknown>) => void
    onDelete: () => void
    isSaving: boolean
}) {
    const [name, setName] = React.useState(block.name)
    const [isVisible, setIsVisible] = React.useState(block.isVisible)
    const [printHeading, setPrintHeading] = React.useState(block.printHeading)
    const [content, setContent] = React.useState<Record<string, unknown>>(block.content)

    React.useEffect(() => {
        setName(block.name)
        setIsVisible(block.isVisible)
        setPrintHeading(block.printHeading)
        setContent(block.content)
    }, [block.id])

    function handleSave(e: React.FormEvent) {
        e.preventDefault()
        onSave({ name, isVisible, printHeading, content })
    }

    const { label, Icon } = BLOCK_TYPE_META[block.type] ?? { label: block.type, Icon: FileText }

    return (
        <form onSubmit={handleSave} className="p-6 space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </div>

            <div className="space-y-1.5">
                <Label>Block Name</Label>
                <Input value={name} disabled={locked} onChange={e => setName(e.target.value)} />
            </div>

            <div className="flex gap-4">
                <div className="flex items-center gap-2">
                    <Switch checked={isVisible} disabled={locked} onCheckedChange={setIsVisible} />
                    <Label>Visible</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch checked={printHeading} disabled={locked} onCheckedChange={setPrintHeading} />
                    <Label>Print Heading</Label>
                </div>
            </div>

            <div className="border-t pt-4">
                <BlockContentEditor
                    type={block.type}
                    content={content}
                    locked={locked}
                    gradingScales={gradingScales}
                    onChange={setContent}
                />
            </div>

            {!locked && (
                <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={isSaving} className="flex-1">
                        {isSaving ? 'Saving…' : 'Save Block'}
                    </Button>
                    <Button type="button" variant="destructive" size="icon" onClick={onDelete} title="Delete Block">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </form>
    )
}

// ── Block Content Editors ─────────────────────────────────

function BlockContentEditor({
    type, content, locked, gradingScales, onChange,
}: {
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
                        <Input
                            value={(content.summary as string) ?? ''}
                            disabled={locked}
                            onChange={e => onChange({ ...content, summary: e.target.value })}
                        />
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
                        <Input
                            value={(content.url as string) ?? ''}
                            disabled={locked}
                            onChange={e => onChange({ ...content, url: e.target.value })}
                            placeholder="https://…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Caption</Label>
                        <Input
                            value={(content.caption as string) ?? ''}
                            disabled={locked}
                            onChange={e => onChange({ ...content, caption: e.target.value })}
                        />
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
                                <Input
                                    value={item.text}
                                    disabled={locked}
                                    onChange={e => {
                                        const next = items.map((it, i) => i === idx ? { ...it, text: e.target.value } : it)
                                        onChange({ ...content, items: next })
                                    }}
                                />
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                                        onChange({ ...content, items: items.filter((_, i) => i !== idx) })
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {!locked && (
                            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, items: [...items, { id: uid(), text: '' }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add Item
                            </Button>
                        )}
                    </div>
                </div>
            )
        }

        case 'table_block': {
            const rows = (content.rows as { id: string; cells: { value: string; isHeader?: boolean }[] }[]) ?? []
            const colCount = rows[0]?.cells?.length ?? 1

            function updateCell(rIdx: number, cIdx: number, value: string) {
                const next = rows.map((r, ri) => ri === rIdx
                    ? { ...r, cells: r.cells.map((c, ci) => ci === cIdx ? { ...c, value } : c) }
                    : r
                )
                onChange({ ...content, rows: next })
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
                                                <Input
                                                    value={cell.value}
                                                    disabled={locked}
                                                    onChange={e => updateCell(rIdx, cIdx, e.target.value)}
                                                    className="border-0 rounded-none h-8 text-xs"
                                                />
                                            </td>
                                        ))}
                                        {!locked && (
                                            <td className="border-0 pl-1">
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange({ ...content, rows: rows.filter((_, i) => i !== rIdx) })}>
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
                            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, rows: [...rows, { id: uid(), cells: Array.from({ length: colCount }, () => ({ value: '' })) }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add Row
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, rows: rows.map(r => ({ ...r, cells: [...r.cells, { value: '' }] })) })}>
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
                                {gradingScales.map(gs => (
                                    <SelectItem key={gs.id} value={gs.id}>{gs.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Grade Categories</Label>
                        {rows.map((row, idx) => (
                            <div key={row.id} className="grid grid-cols-[1fr_5rem_1fr_auto] gap-2 items-center">
                                <Input
                                    value={row.category} placeholder="Category"
                                    disabled={locked}
                                    onChange={e => onChange({ ...content, rows: rows.map((r, i) => i === idx ? { ...r, category: e.target.value } : r) })}
                                />
                                <Input
                                    type="number" value={row.weight} placeholder="Weight %"
                                    disabled={locked}
                                    onChange={e => onChange({ ...content, rows: rows.map((r, i) => i === idx ? { ...r, weight: Number(e.target.value) } : r) })}
                                />
                                <Input
                                    value={row.description} placeholder="Description"
                                    disabled={locked}
                                    onChange={e => onChange({ ...content, rows: rows.map((r, i) => i === idx ? { ...r, description: e.target.value } : r) })}
                                />
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => onChange({ ...content, rows: rows.filter((_, i) => i !== idx) })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <div className="flex items-center gap-4">
                            {!locked && (
                                <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, rows: [...rows, { id: uid(), category: '', weight: 0, description: '' }] })}>
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
            const questions = (content.questions as {
                id: string; type: 'MCQ' | 'TF'; text: string; points: number;
                choices: { id: string; text: string; isCorrect: boolean }[]
            }[]) ?? []

            function updateQuestion(idx: number, updates: object) {
                onChange({ ...content, questions: questions.map((q, i) => i === idx ? { ...q, ...updates } : q) })
            }

            return (
                <div className="space-y-4">
                    {questions.map((q, qIdx) => (
                        <div key={q.id} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">{q.type}</span>
                                <Input
                                    className="flex-1 text-sm"
                                    value={q.text} placeholder="Question text"
                                    disabled={locked}
                                    onChange={e => updateQuestion(qIdx, { text: e.target.value })}
                                />
                                <Input
                                    type="number" className="w-16 text-sm" value={q.points}
                                    disabled={locked}
                                    onChange={e => updateQuestion(qIdx, { points: Number(e.target.value) })}
                                />
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => onChange({ ...content, questions: questions.filter((_, i) => i !== qIdx) })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {q.type === 'MCQ' && (
                                <div className="space-y-1 pl-2">
                                    {q.choices.map((c, cIdx) => (
                                        <div key={c.id} className="flex items-center gap-2">
                                            <Checkbox
                                                checked={c.isCorrect} disabled={locked}
                                                onCheckedChange={v => updateQuestion(qIdx, { choices: q.choices.map((ch, i) => i === cIdx ? { ...ch, isCorrect: !!v } : ch) })}
                                            />
                                            <Input
                                                value={c.text} placeholder="Choice" className="text-sm flex-1"
                                                disabled={locked}
                                                onChange={e => updateQuestion(qIdx, { choices: q.choices.map((ch, i) => i === cIdx ? { ...ch, text: e.target.value } : ch) })}
                                            />
                                            {!locked && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => updateQuestion(qIdx, { choices: q.choices.filter((_, i) => i !== cIdx) })}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {!locked && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => updateQuestion(qIdx, { choices: [...q.choices, { id: uid(), text: '', isCorrect: false }] })}>
                                            <Plus className="h-3.5 w-3.5 mr-1" />Add Choice
                                        </Button>
                                    )}
                                </div>
                            )}
                            {q.type === 'TF' && (
                                <div className="pl-2 flex gap-4">
                                    {(['True', 'False'] as const).map(opt => (
                                        <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                            <input
                                                type="radio" name={`tf-${q.id}`} value={opt}
                                                checked={q.choices.find(c => c.text === opt)?.isCorrect ?? false}
                                                disabled={locked}
                                                onChange={() => updateQuestion(qIdx, {
                                                    choices: [
                                                        { id: uid(), text: 'True', isCorrect: opt === 'True' },
                                                        { id: uid(), text: 'False', isCorrect: opt === 'False' },
                                                    ],
                                                })}
                                            />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {!locked && (
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, questions: [...questions, { id: uid(), type: 'MCQ', text: '', points: 1, choices: [] }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add MCQ
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, questions: [...questions, { id: uid(), type: 'TF', text: '', points: 1, choices: [{ id: uid(), text: 'True', isCorrect: true }, { id: uid(), text: 'False', isCorrect: false }] }] })}>
                                <Plus className="h-4 w-4 mr-1" />Add T/F
                            </Button>
                        </div>
                    )}
                </div>
            )
        }

        case 'schedule_block': {
            const units = (content.units as {
                id: string; weekNum: number; date: string; label: string;
                topics: { id: string; topic: string; reading: string; assignment: string; category: string; points: number; dueDate: string }[]
            }[]) ?? []

            function updateUnit(uIdx: number, updates: object) {
                onChange({ ...content, units: units.map((u, i) => i === uIdx ? { ...u, ...updates } : u) })
            }
            function updateTopic(uIdx: number, tIdx: number, updates: object) {
                const newTopics = units[uIdx].topics.map((t, i) => i === tIdx ? { ...t, ...updates } : t)
                updateUnit(uIdx, { topics: newTopics })
            }

            return (
                <div className="space-y-4">
                    {units.map((unit, uIdx) => (
                        <div key={unit.id} className="border rounded-md p-3 space-y-3">
                            <div className="grid grid-cols-[5rem_1fr_1fr_auto] gap-2 items-center">
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Week</Label>
                                    <Input
                                        type="number" value={unit.weekNum}
                                        disabled={locked}
                                        onChange={e => updateUnit(uIdx, { weekNum: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Date</Label>
                                    <Input
                                        type="date" value={unit.date}
                                        disabled={locked}
                                        onChange={e => updateUnit(uIdx, { date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-xs">Label</Label>
                                    <Input
                                        value={unit.label} placeholder="Week label"
                                        disabled={locked}
                                        onChange={e => updateUnit(uIdx, { label: e.target.value })}
                                    />
                                </div>
                                {!locked && (
                                    <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => onChange({ ...content, units: units.filter((_, i) => i !== uIdx) })}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Topics */}
                            <div className="pl-2 space-y-2">
                                {unit.topics.map((topic, tIdx) => (
                                    <div key={topic.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_5rem_1fr_auto] gap-1 text-xs items-center">
                                        {(['topic', 'reading', 'assignment', 'category'] as const).map(field => (
                                            <Input
                                                key={field}
                                                value={topic[field]}
                                                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                                disabled={locked}
                                                className="h-7 text-xs"
                                                onChange={e => updateTopic(uIdx, tIdx, { [field]: e.target.value })}
                                            />
                                        ))}
                                        <Input
                                            type="number" value={topic.points}
                                            placeholder="Pts" disabled={locked}
                                            className="h-7 text-xs"
                                            onChange={e => updateTopic(uIdx, tIdx, { points: Number(e.target.value) })}
                                        />
                                        <Input
                                            type="date" value={topic.dueDate}
                                            disabled={locked}
                                            className="h-7 text-xs"
                                            onChange={e => updateTopic(uIdx, tIdx, { dueDate: e.target.value })}
                                        />
                                        {!locked && (
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateUnit(uIdx, { topics: unit.topics.filter((_, i) => i !== tIdx) })}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {!locked && (
                                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => updateUnit(uIdx, { topics: [...unit.topics, { id: uid(), topic: '', reading: '', assignment: '', category: '', points: 0, dueDate: '' }] })}>
                                        <Plus className="h-3.5 w-3.5 mr-1" />Add Topic
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {!locked && (
                        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, units: [...units, { id: uid(), weekNum: units.length + 1, date: '', label: '', topics: [] }] })}>
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
                            <Input
                                value={att.name} placeholder="File name"
                                disabled={locked}
                                onChange={e => onChange({ ...content, attachments: attachments.map((a, i) => i === idx ? { ...a, name: e.target.value } : a) })}
                            />
                            <Input
                                value={att.url} placeholder="URL"
                                disabled={locked}
                                onChange={e => onChange({ ...content, attachments: attachments.map((a, i) => i === idx ? { ...a, url: e.target.value } : a) })}
                            />
                            <Input
                                value={att.description ?? ''} placeholder="Description"
                                disabled={locked}
                                onChange={e => onChange({ ...content, attachments: attachments.map((a, i) => i === idx ? { ...a, description: e.target.value } : a) })}
                            />
                            {!locked && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => onChange({ ...content, attachments: attachments.filter((_, i) => i !== idx) })}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {!locked && (
                        <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...content, attachments: [...attachments, { id: uid(), name: '', url: '', description: '' }] })}>
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
