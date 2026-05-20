"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Curated set of icons useful for educational/institutional quick links
export const ICON_OPTIONS: string[] = [
  // Navigation & layout
  "Home", "LayoutDashboard", "LayoutList", "Grid2x2", "Menu", "Sidebar",
  // Academic
  "GraduationCap", "BookOpen", "Book", "BookMarked", "BookText", "Pencil",
  "PenLine", "NotebookPen", "Notebook", "FileText", "ClipboardList", "Clipboard",
  "Library", "School",
  // Communication
  "Mail", "MailOpen", "MessageSquare", "MessageCircle", "Bell", "BellRing",
  "Phone", "PhoneCall", "Megaphone",
  // Files & documents
  "File", "FileCheck", "FilePlus", "Folder", "FolderOpen", "FolderKanban",
  "Download", "Upload", "Paperclip",
  // People & identity
  "User", "Users", "UserCheck", "UserRound", "Contact", "BadgeCheck",
  // Calendar & time
  "Calendar", "CalendarDays", "CalendarCheck", "Clock", "Timer", "AlarmClock",
  // Cloud & storage
  "Cloud", "CloudDownload", "CloudUpload", "CloudOff", "CloudLightning",
  "HardDrive", "HardDriveDownload", "HardDriveUpload", "Database", "DatabaseBackup",
  // Network & connectivity
  "Network", "Wifi", "WifiOff", "WifiHigh", "Server", "ServerCrash",
  "Share2", "Antenna", "Cable", "Podcast",
  // Devices
  "Monitor", "Laptop", "Tablet", "Smartphone", "Printer",
  // Links & navigation
  "Link", "Link2", "ExternalLink", "Globe", "Globe2", "Compass",
  // Money & resources
  "DollarSign", "CreditCard", "Wallet", "Receipt", "BadgeDollarSign",
  // Tools & settings
  "Settings", "Settings2", "Wrench", "Tool", "Sliders", "LifeBuoy",
  // Info & alerts
  "Info", "HelpCircle", "AlertCircle", "CheckCircle2", "ListChecks",
  // Misc useful
  "Star", "Heart", "Bookmark", "Flag", "Tag", "Trophy", "Award",
  "Map", "MapPin", "Building", "Building2", "Briefcase", "BriefcaseBusiness",
  "ChartBar", "BarChart2", "TrendingUp", "Lightbulb", "Zap", "Shield",
];

type LucideComponent = React.FC<{ className?: string }>;

function getIcon(name: string): LucideComponent | null {
  return (Icons as Record<string, unknown>)[name] as LucideComponent | null;
}

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? ICON_OPTIONS.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase().replace(/\s/g, ""))
      )
    : ICON_OPTIONS;

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const SelectedIcon = value ? getIcon(value) : null;

  return (
    <div ref={containerRef} className={cn("relative focus-within:outline-none focus-within:ring-1 focus-within:ring-yellow-400", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-3 border border-input bg-background text-sm transition-colors w-full"
      >
        {SelectedIcon ? (
          <>
            <SelectedIcon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">{value}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Pick an icon…</span>
        )}
        {value && (
          <span
            role="button"
            tabIndex={0}
            className="ml-auto text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 border bg-popover shadow-lg">
          {/* Search */}
          <div className="p-2 border-b flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search icons…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Icon grid */}
          <div className="p-2 max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No icons match.</p>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {filtered.map((name) => {
                  const Icon = getIcon(name);
                  if (!Icon) return null;
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => {
                        onChange(name);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "flex items-center justify-center rounded-md p-1.5 h-8 w-8 transition-colors hover:bg-muted",
                        value === name && "bg-primary/15 text-primary ring-1 ring-primary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
