import React from 'react'
import {
    Plus, ChevronLeft,
    Type, AlignLeft, Video, List, Table2, BarChart3,
    Paperclip, MessageSquare, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlockType } from '@syllabee/types'

// ── Column mode types ─────────────────────────────────────────────────────────

export type Col1Mode = 'list' | 'add' | 'edit'
export type Col2Mode = 'hidden' | 'segmentList' | 'segmentAdd' | 'segmentEdit'
export type Col3Mode = 'blocks' | 'picker' | 'addBlock' | 'editBlock'

// ── Block metadata ────────────────────────────────────────────────────────────

export const BLOCK_META: Record<BlockType, { label: string; Icon: React.ElementType }> = {
    content_block:              { label: 'Content',             Icon: Type },
    details_block:              { label: 'Details',             Icon: AlignLeft },
    video_block:                { label: 'Video',               Icon: Video },
    list_block:                 { label: 'List',                Icon: List },
    table_block:                { label: 'Table',               Icon: Table2 },
    grade_determination_block:  { label: 'Grade Determination', Icon: BarChart3 },
    file_block:                 { label: 'Files',               Icon: Paperclip },
    response_block:             { label: 'Response',            Icon: MessageSquare },
    schedule_block:             { label: 'Schedule',            Icon: Calendar },
}

export const SEG_HEADING_OPTS = [2, 3, 4, 5, 6]
export const BLK_HEADING_OPTS = [3, 4, 5, 6]

// ── Utilities ─────────────────────────────────────────────────────────────────

export function uid() { return Math.random().toString(36).slice(2) }

export function newBlockContent(type: BlockType): Record<string, unknown> {
    switch (type) {
        case 'content_block':             return { html: '' }
        case 'details_block':             return { summary: '', html: '' }
        case 'video_block':               return { url: '', caption: '' }
        case 'list_block':                return { style: 'bullet', items: [] }
        case 'table_block':               return { rows: [{ id: uid(), cells: [{ value: '' }] }] }
        case 'grade_determination_block': return { rows: [], gradingScaleId: '' }
        case 'file_block':                return { attachments: [] }
        case 'response_block':            return { questions: [] }
        case 'schedule_block':            return { units: [] }
        default:                          return {}
    }
}

// ── Shared UI components ──────────────────────────────────────────────────────

export function ColHeader({ title, subtitle, onBack, icon, children }: {
    title: string
    subtitle: string
    onBack?: () => void
    icon?: React.ReactNode
    children?: React.ReactNode
}) {
    return (
        <div className="shrink-0 flex items-center gap-2 px-3 h-14 border-b bg-primary text-black">
            {onBack && (
                <button
                    onClick={onBack}
                    className="p-1 text-black bg-black/10 hover:bg-black/20 rounded-sm transition-colors shrink-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
            )}
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="flex-1 flex flex-col">
                <span className="text-sm font-semibold truncate">{title}</span>
                <span className="text-xs text-muted truncate">{subtitle}</span>
            </span>
            {children}
        </div>
    )
}

export function HeaderButton({ onClick, children, title }: {
    onClick: () => void
    children: React.ReactNode
    title?: string
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className="p-1.5 text-black bg-black/10 hover:bg-black/20 rounded-sm transition-colors shrink-0"
        >
            {children}
        </button>
    )
}

export function AddButton({ onClick, label }: { onClick: () => void; label?: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-1 px-2 h-7 text-xs font-medium',
                'bg-black/10 hover:bg-black/20 rounded-sm transition-colors shrink-0',
            )}
        >
            <Plus className="h-3.5 w-3.5" />{label}
        </button>
    )
}
