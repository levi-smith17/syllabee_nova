import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SyllabusBlock } from '@syllabee/types'

interface ResponseProps {
    maxAttempts: number
    pointsLadder: boolean
    pointsLadderDeduction: number
}

interface Props {
    block: SyllabusBlock
    isInteractive: boolean
    responseProps?: ResponseProps
}

export function BlockRenderer({ block, isInteractive, responseProps }: Props) {
    const data = block.content

    switch (block.type) {
        case 'content_block':
            return <ContentBlockView name={block.name} data={data} />
        case 'details_block':
            return <DetailsBlockView data={data} />
        case 'video_block':
            return <VideoBlockView data={data} />
        case 'list_block':
            return <ListBlockView data={data} />
        case 'table_block':
            return <TableBlockView data={data} />
        case 'grade_determination_block':
            return <GradeDetBlockView data={data} />
        case 'schedule_block':
            return <ScheduleBlockView data={data} />
        case 'response_block':
            if (!isInteractive) return null
            return <ResponseBlockView data={data} responseProps={responseProps} />
        case 'file_block':
            return <FileBlockView data={data} />
        default:
            return null
    }
}

// ── Content ───────────────────────────────────────────────────────────────────

function ContentBlockView({ name, data }: { name: string; data: Record<string, unknown> }) {
    const html = (data.html as string) ?? ''
    return (
        <div>
            {name && <h3 className="font-semibold text-base mb-2">{name}</h3>}
            <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    )
}

// ── Details ───────────────────────────────────────────────────────────────────

function DetailsBlockView({ data }: { data: Record<string, unknown> }) {
    const [open, setOpen] = React.useState(false)
    type Section = { id: string; html: string }
    const sections = data.sections as Section[] | undefined
    const legacyHtml = (data.html as string) ?? ''
    return (
        <div className="rounded-lg border">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-left"
            >
                {(data.summary as string) ?? 'Details'}
                <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="border-t px-4 py-3">
                    {sections ? (
                        <div className="space-y-4">
                            {sections.filter(s => s.html).map(sec => (
                                <div key={sec.id} className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: sec.html }} />
                            ))}
                        </div>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: legacyHtml }} />
                    )}
                </div>
            )}
        </div>
    )
}

// ── Video ─────────────────────────────────────────────────────────────────────

function toEmbedUrl(url: string): string | null {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/)
    if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`
    const vim = url.match(/vimeo\.com\/(\d+)/)
    if (vim) return `https://player.vimeo.com/video/${vim[1]}`
    return null
}

function VideoBlockView({ data }: { data: Record<string, unknown> }) {
    const url = (data.url as string) ?? ''
    if (!url) return null
    const embedUrl = toEmbedUrl(url)
    return (
        <div className="space-y-2">
            {embedUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                    <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
                </div>
            ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">
                    Watch video →
                </a>
            )}
            {data.caption ? (
                <p className="text-xs text-muted-foreground">{String(data.caption)}</p>
            ) : null}
        </div>
    )
}

// ── List ──────────────────────────────────────────────────────────────────────

type ListItemNode = { id: string; text: string; children?: { id: string; style: string; items: ListItemNode[] } }

function renderListLevel(items: ListItemNode[], style: string): React.ReactNode {
    const cssStyle = !style || style === 'bullet' ? 'disc' : style === 'numbered' ? 'decimal' : style
    return (
        <ul className="pl-5 space-y-0.5" style={{ listStyleType: cssStyle }}>
            {items.map(item => (
                <li key={item.id}>
                    {item.text.startsWith('<')
                        ? <span dangerouslySetInnerHTML={{ __html: item.text }} />
                        : item.text}
                    {item.children && renderListLevel(item.children.items, item.children.style)}
                </li>
            ))}
        </ul>
    )
}

function ListBlockView({ data }: { data: Record<string, unknown> }) {
    type FlatItem = { id: string; text: string; level?: number }

    // New tree format: items have optional children with their own style
    const rawItems = (data.items as ListItemNode[]) ?? []
    if (!rawItems.length) return null

    // Detect intermediate format: levelStyles dict + flat items with level property
    if (data.levelStyles) {
        const levelStyles = (data.levelStyles as Record<string, string>) ?? {}
        const flatItems = rawItems as unknown as FlatItem[]
        return (
            <ul className="pl-4 space-y-1 text-sm">
                {flatItems.map(item => (
                    <li key={item.id} style={{ listStyleType: levelStyles[String(item.level ?? 1)] ?? 'disc', marginLeft: `${((item.level ?? 1) - 1) * 20}px` }}>
                        {item.text}
                    </li>
                ))}
            </ul>
        )
    }

    const rawStyle = (data.style as string) ?? 'disc'

    // Legacy format: style was 'bullet' or 'numbered', no children
    if (rawStyle === 'bullet' || rawStyle === 'numbered') {
        const Tag = rawStyle === 'numbered' ? 'ol' : 'ul'
        return (
            <Tag className={`text-sm pl-5 space-y-1 ${rawStyle === 'numbered' ? 'list-decimal' : 'list-disc'}`}>
                {rawItems.map(item => <li key={item.id}>{item.text}</li>)}
            </Tag>
        )
    }

    // Current tree format
    return <div className="text-sm">{renderListLevel(rawItems, rawStyle)}</div>
}

// ── Table ─────────────────────────────────────────────────────────────────────

function TableBlockView({ data }: { data: Record<string, unknown> }) {
    type Cell = { value: string; isHeader?: boolean }
    type Row = { id: string; cells: Cell[] }
    const rows = (data.rows as Row[]) ?? []
    if (!rows.length) return null
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <tbody>
                    {rows.map(row => (
                        <tr key={row.id}>
                            {row.cells.map((cell, ci) =>
                                cell.isHeader ? (
                                    <th key={ci} className="border px-3 py-2 font-semibold bg-muted text-left">{cell.value}</th>
                                ) : (
                                    <td key={ci} className="border px-3 py-2">{cell.value}</td>
                                )
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── Grade Determination ───────────────────────────────────────────────────────

function GradeDetBlockView({ data }: { data: Record<string, unknown> }) {
    type Row = { id: string; category: string; weight: number; description?: string }
    const rows = (data.rows as Row[]) ?? []
    if (!rows.length) return null
    const total = rows.reduce((s, r) => s + (r.weight || 0), 0)
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b">
                    <th className="pb-2 text-left font-semibold">Category</th>
                    <th className="pb-2 text-right font-semibold">Weight</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(row => (
                    <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2">
                            <p>{row.category}</p>
                            {row.description && <p className="text-xs text-muted-foreground">{row.description}</p>}
                        </td>
                        <td className="py-2 text-right">{row.weight}%</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td className="pt-2 font-semibold">Total</td>
                    <td className="pt-2 text-right font-semibold">{total}%</td>
                </tr>
            </tfoot>
        </table>
    )
}

// ── Schedule ──────────────────────────────────────────────────────────────────

function ScheduleBlockView({ data }: { data: Record<string, unknown> }) {
    type Topic = { id: string; topic: string; reading?: string; assignment?: string }
    type Unit = { id: string; weekNum: number; date?: string; label?: string; topics: Topic[] }
    const units = (data.units as Unit[]) ?? []
    if (!units.length) return <p className="text-sm text-muted-foreground italic">No schedule available.</p>
    return (
        <div className="space-y-4">
            {units.map(unit => (
                <div key={unit.id} className="rounded-lg border">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                        <span className="font-medium text-sm">
                            {unit.label ? unit.label : `Week ${unit.weekNum}`}
                        </span>
                        {unit.date && (
                            <span className="text-xs text-muted-foreground">
                                {new Date(unit.date).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <ul className="divide-y">
                        {(unit.topics ?? []).map(topic => (
                            <li key={topic.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                                <span className="flex-1">{topic.topic}</span>
                                {topic.reading && (
                                    <span className="text-xs text-muted-foreground shrink-0">{topic.reading}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}

// ── Response / Quiz ───────────────────────────────────────────────────────────

function ResponseBlockView({
    data,
    responseProps,
}: {
    data: Record<string, unknown>
    responseProps?: ResponseProps
}) {
    type Choice = { id: string; text: string; isCorrect: boolean }
    type Question = { id: string; type: 'MCQ' | 'TF'; text: string; points: number; choices: Choice[] }
    const questions = (data.questions as Question[]) ?? []
    const [answers, setAnswers] = React.useState<Record<string, string>>({})
    const [submitted, setSubmitted] = React.useState(false)
    const [score, setScore] = React.useState<number | null>(null)
    const [attempts, setAttempts] = React.useState(0)

    if (!questions.length) return null

    const maxAttempts = responseProps?.maxAttempts ?? 1

    function handleSubmit() {
        let correct = 0
        questions.forEach(q => {
            const selected = q.choices.find(c => c.id === answers[q.id])
            if (selected?.isCorrect) correct++
        })
        setScore(correct)
        setAttempts(a => a + 1)
        if (attempts + 1 >= maxAttempts) setSubmitted(true)
    }

    const canRetry = !submitted && attempts > 0 && attempts < maxAttempts

    return (
        <div className="space-y-4">
            {questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border p-4">
                    <p className="text-sm font-medium mb-3">{i + 1}. {q.text}</p>
                    <div className="space-y-2">
                        {q.choices.map(c => {
                            const isSelected = answers[q.id] === c.id
                            return (
                                <label
                                    key={c.id}
                                    className={cn(
                                        'flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors',
                                        !submitted && isSelected && 'border-primary bg-primary/5',
                                        submitted && c.isCorrect && 'border-green-500 bg-green-50 dark:bg-green-950',
                                        submitted && isSelected && !c.isCorrect && 'border-red-500 bg-red-50 dark:bg-red-950',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name={`q-${q.id}`}
                                        value={c.id}
                                        disabled={submitted}
                                        checked={isSelected}
                                        onChange={() => setAnswers(a => ({ ...a, [q.id]: c.id }))}
                                        className="accent-primary"
                                    />
                                    {c.text}
                                </label>
                            )
                        })}
                    </div>
                </div>
            ))}

            {!submitted && (
                <button
                    onClick={handleSubmit}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Submit Answers
                </button>
            )}

            {score !== null && (
                <div className={cn(
                    'rounded-lg border p-4 text-sm',
                    submitted
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                        : 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
                )}>
                    Score: <strong>{score}</strong> / {questions.length} correct
                    {canRetry && (
                        <span className="ml-2 text-muted-foreground">
                            ({maxAttempts - attempts} attempt{maxAttempts - attempts !== 1 ? 's' : ''} remaining)
                        </span>
                    )}
                </div>
            )}

            {canRetry && (
                <button
                    onClick={() => { setAnswers({}); setScore(null) }}
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                    Try Again
                </button>
            )}
        </div>
    )
}

// ── File ──────────────────────────────────────────────────────────────────────

function FileBlockView({ data }: { data: Record<string, unknown> }) {
    type Attachment = { id: string; name: string; url: string; description?: string }
    const attachments = (data.attachments as Attachment[]) ?? []
    if (!attachments.length) return null
    return (
        <div className="space-y-2">
            {attachments.map(f => (
                <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                >
                    <span className="text-xl">📎</span>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{f.name}</p>
                        {f.description && <p className="text-xs text-muted-foreground truncate">{f.description}</p>}
                    </div>
                    <span className="text-primary text-xs shrink-0">Download</span>
                </a>
            ))}
        </div>
    )
}
