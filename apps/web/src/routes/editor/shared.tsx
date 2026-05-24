import React from 'react'
import {
    Plus, ChevronLeft, Trash2,
    Type, AlignLeft, Video, List, Table2, ChartCandlestick,
    Paperclip, MessageSquare, Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BlockType } from '@syllabee/types'

// ── Column mode types ─────────────────────────────────────────────────────────

export type Col1Mode = 'listSyllabi' | 'addSyllabus' | 'editSyllabus' | 'addGradingScale' | 'editGradingScale'
export type Col2Mode = 'listSegments' | 'addSegment' | 'editSegment' | 'hidden'
export type Col3Mode = 'listBlocks' | 'addBlockPicker' | 'addBlock' | 'editBlock' | 'studentProgress'

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
        <div className="flex items-center gap-2 px-3 h-14 shrink-0 border-b bg-primary text-primary-foreground">
            {onBack && (
                <Button
                    type="button" variant="ghost" onClick={onBack}
                    className="h-7 w-7 p-2 rounded-sm shrink-0 bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                </Button>
            )}
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="flex-1 flex flex-col">
                <span className="text-sm font-semibold truncate">{title}</span>
                <span className="text-xs text-primary-foreground/60 truncate">{subtitle}</span>
            </span>
            {children}
        </div>
    )
}

export function AddButton({ onClick, label }: { onClick: () => void; label?: string }) {
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            className="h-7 w-7 p-2 rounded-sm shrink-0 bg-overlay-subtle text-primary-foreground hover:bg-overlay-subtle-hover hover:text-primary-foreground transition-colors"
        >
            <Plus className="h-4 w-4 shrink-0" />{label}
        </Button>
    )
}

export function DeleteButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            className="h-7 w-7 p-2 rounded-sm shrink-0 bg-destructive text-destructive-foreground hover:bg-destructive/70 transition-colors"
        >
            <Trash2 className="h-4 w-4 shrink-0" />
        </Button>
    )
}
