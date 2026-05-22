import React from 'react'
import {
    Plus, ChevronLeft, Trash2,
    Type, AlignLeft, Video, List, Table2, ChartCandlestick,
    Paperclip, MessageSquare, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlockType } from '@syllabee/types'

// ── Column mode types ─────────────────────────────────────────────────────────

export type Col1Mode = 'list' | 'add' | 'edit' | 'grading-scale-add' | 'grading-scale-edit'
export type Col2Mode = 'hidden' | 'segmentList' | 'segmentAdd' | 'segmentEdit'
export type Col3Mode = 'blocks' | 'picker' | 'addBlock' | 'editBlock' | 'studentProgress'

// ── Block metadata ────────────────────────────────────────────────────────────

export const BLOCK_META: Record<BlockType, { label: string; Icon: React.ElementType, description: string; }> = {
    content_block:              { label: 'Content',             Icon: Type,              description: 'A general rich-text module for instructor introductions, course descriptions, or general overview text.' },
    details_block:              { label: 'Details',             Icon: AlignLeft,         description: 'An expandable, toggleable disclosure section used to tuck away secondary text or supplementary footnotes.' },
    file_block:                 { label: 'Files',               Icon: Paperclip,         description: 'A centralized resource panel for students to download required reading PDFs, templates, or other supplemental materials.' },
    grade_determination_block:  { label: 'Grade Determination', Icon: ChartCandlestick,  description: 'A clear breakdown of assignment weightings, total course points, and the final grading scale.' },
    list_block:                 { label: 'List',                Icon: List,              description: 'A structured formatting block used to outline sequential learning objectives, prerequisite skills, or materials.' },
    response_block:             { label: 'Response',            Icon: MessageSquare,     description: 'An interactive form block containing multiple-choice or true/false questions.' },
    schedule_block:             { label: 'Schedule',            Icon: Calendar,          description: 'A chronological course timeline detailing weekly topics, required readings, and major assignment deadlines.' },
    table_block:                { label: 'Table',               Icon: Table2,            description: 'A versatile multi-column grid layout for presenting structured data rows or numerical metrics.' },
    video_block:                { label: 'Video',               Icon: Video,             description: 'An embedded media layout window used for streaming instructional recordings or web clips.' },
}

export const SEG_HEADING_OPTS = [2, 3, 4, 5, 6]
export const BLK_HEADING_OPTS = [3, 4, 5, 6]

// ── Utilities ─────────────────────────────────────────────────────────────────

export function uid() { return Math.random().toString(36).slice(2) }

export function newBlockContent(type: BlockType): Record<string, unknown> {
    switch (type) {
        case 'content_block':             return { html: '' }
        case 'details_block':             return { summary: '', sections: [{ id: uid(), html: '' }] }
        case 'file_block':                return { attachments: [] }
        case 'grade_determination_block': return { rows: [], gradingScaleId: '' }
        case 'list_block':                return { style: 'disc', items: [{ id: uid(), text: '' }] }
        case 'response_block':            return { questions: [] }
        case 'schedule_block':            return { units: [] }
        case 'table_block':               return { rows: [{ id: uid(), cells: [{ value: '' }] }] }
        case 'video_block':               return { url: '', caption: '' }
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
                <span className="text-xs text-black/60 truncate">{subtitle}</span>
            </span>
            {children}
        </div>
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

export function DeleteButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-1 px-2 h-7 text-xs font-medium',
                'bg-destructive text-destructive-foreground hover:bg-destructive/70 rounded-sm transition-colors shrink-0',
            )}
        >
            <Trash2 className="h-3.5 w-3.5" />
        </button>
    )
}
