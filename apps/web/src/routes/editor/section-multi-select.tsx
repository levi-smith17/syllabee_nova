import React from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EditorSection } from '@syllabee/types'

export function sectionLabel(sec: EditorSection) {
    return `${sec.courseCode}-${sec.sectionCode}-${sec.termCode}`
}

export function SectionMultiSelect({ sections, value, onChange, disabled }: {
    sections: EditorSection[]
    value: string[]
    onChange: (ids: string[]) => void
    disabled?: boolean
}) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    const sortedSections = React.useMemo(() =>
        [...sections].sort((a, b) => {
            if (b.termCode < a.termCode) return -1
            if (b.termCode > a.termCode) return 1
            if (a.courseCode < b.courseCode) return -1
            if (a.courseCode > b.courseCode) return 1
            if (a.sectionCode < b.sectionCode) return -1
            if (a.sectionCode > b.sectionCode) return 1
            return 0
        }), [sections])

    React.useEffect(() => {
        if (!open) return
        function handle(e: MouseEvent) {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) { setOpen(false); setSearch('') }
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [open])

    const selectedSections = sortedSections.filter(s => value.includes(s.id))
    const unselectedSections = sortedSections.filter(s => !value.includes(s.id))
    const filtered = search
        ? unselectedSections.filter(s => sectionLabel(s).toLowerCase().includes(search.toLowerCase()))
        : unselectedSections

    function select(id: string) { onChange([...value, id]) }
    function deselect(id: string) { onChange(value.filter(v => v !== id)) }

    const triggerLabel = value.length === 0
        ? 'No sections — shared across all'
        : `${value.length} of ${sortedSections.length} section${sortedSections.length !== 1 ? 's' : ''} selected`

    return (
        <div className="relative">
            <button
                type="button"
                ref={triggerRef}
                disabled={disabled}
                onClick={() => !disabled && setOpen(o => !o)}
                className={cn(
                    'h-8 w-full border border-input bg-transparent px-3 text-xs flex items-center justify-between gap-2 rounded-none',
                    'hover:bg-accent transition-colors disabled:opacity-50 disabled:pointer-events-none',
                    open && 'border-ring',
                )}
            >
                <span className="truncate text-muted-foreground">{triggerLabel}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 top-full left-0 right-0 border border-input bg-popover shadow-md mt-px max-h-48 overflow-y-auto"
                >
                    <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search sections…"
                        className="w-full h-7 px-3 text-xs border-b border-input bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                    {filtered.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground italic">
                            {unselectedSections.length === 0 ? 'All sections selected.' : 'No sections match.'}
                        </p>
                    ) : (
                        filtered.map(sec => (
                            <button
                                key={sec.id}
                                type="button"
                                onClick={() => { select(sec.id) }}
                                className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                            >
                                <div className="h-4 w-4 shrink-0 rounded-sm border border-primary" />
                                {sectionLabel(sec)}
                            </button>
                        ))
                    )}
                </div>
            )}

            {selectedSections.map(sec => (
                <div
                    key={sec.id}
                    className="flex items-center justify-between border border-primary bg-primary/5 px-3 py-1.5 mt-1"
                >
                    <span className="text-xs">{sectionLabel(sec)}</span>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => deselect(sec.id)}
                        className="text-muted-foreground hover:text-foreground ml-2 shrink-0 disabled:opacity-40"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            ))}
        </div>
    )
}
