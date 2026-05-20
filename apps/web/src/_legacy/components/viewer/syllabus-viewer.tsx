"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, Menu, X, CheckCircle2, Circle, Moon, Sun, BookOpen } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BlockRenderer } from "./block-renderer";
import type {
  Block,
  Bond,
  Course,
  MasterBond,
  MasterSyllabus,
  Section,
  Segment,
  SectionProgress,
  Term,
} from "@prisma/client";

type FullSyllabus = MasterSyllabus & {
  masterBonds: (MasterBond & {
    segment: Segment & {
      bonds: (Bond & { block: Block & Record<string, unknown> })[];
    };
  })[];
};

type FullSection = Section & {
  course: Course;
  term: Term;
};

interface Props {
  syllabus: FullSyllabus;
  section: FullSection;
  progress: SectionProgress | null;
  activeSegmentId?: string;
  userId: string | null;
}

export function SyllabusViewer({
  syllabus,
  section,
  progress,
  activeSegmentId: initialActiveId,
  userId,
}: Props) {
  const router = useRouter();
  const [activeSegmentId, setActiveSegmentId] = React.useState(
    initialActiveId ?? syllabus.masterBonds[0]?.segment.id
  );
  const [tocOpen, setTocOpen] = React.useState(false);

  const activeSegment = syllabus.masterBonds.find(
    (mb) => mb.segment.id === activeSegmentId
  )?.segment;

  const isInteractive = syllabus.interactionMode === "INTERACTIVE";

  function selectSegment(segId: string) {
    setActiveSegmentId(segId);
    setTocOpen(false);
    router.replace(`?seg=${segId}`, { scroll: false });
  }

  const totalSegments = syllabus.masterBonds.length;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── TOC (left column) ───────────────────────────────────────────── */}

      {/* Mobile overlay */}
      {tocOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setTocOpen(false)}
        />
      )}

      <aside
        className={cn(
          "z-30 flex flex-col w-72 shrink-0 border-r bg-muted/20",
          // Desktop: always visible; Mobile: slide-over
          "fixed lg:relative inset-y-0 left-0",
          "transition-transform duration-200",
          tocOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">
              {syllabus.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {section.course.code} · {section.term.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-7 w-7 shrink-0"
            onClick={() => setTocOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        {isInteractive && progress && (
          <div className="px-4 py-2 border-b">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>0 / {totalSegments}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "0%" }} />
            </div>
          </div>
        )}

        {/* Segment list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {syllabus.masterBonds.map((mb, idx) => {
            const seg = mb.segment;
            const isActive = seg.id === activeSegmentId;
            return (
              <button
                key={seg.id}
                onClick={() => selectSegment(seg.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted/50",
                  isActive && "bg-muted font-medium text-primary"
                )}
              >
                <span className="shrink-0 text-xs text-muted-foreground w-5 text-right">
                  {idx + 1}
                </span>
                <span className="flex-1 truncate">{seg.title}</span>
                {isInteractive && (
                  <CheckCircle2
                    className={cn(
                      "h-4 w-4 shrink-0",
                      false // TODO: wire progress
                        ? "text-green-500"
                        : "text-muted-foreground/40"
                    )}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: print + theme */}
        <div className="border-t p-3 flex items-center gap-2">
          {syllabus.allowPrint && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 flex-1"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          )}
          <ThemeToggleSmall />
        </div>
      </aside>

      {/* ── Content (right column) ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 backdrop-blur px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTocOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm truncate">
            {activeSegment?.title ?? syllabus.title}
          </span>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {activeSegment ? (
            <SegmentContent
              segment={activeSegment}
              isInteractive={isInteractive}
              userId={userId}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Select a section.</p>
          )}
        </div>
      </main>
    </div>
  );
}

function SegmentContent({
  segment,
  isInteractive,
  userId,
}: {
  segment: Segment & { bonds: (Bond & { block: Block & Record<string, unknown> })[] };
  isInteractive: boolean;
  userId: string | null;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{segment.title}</h1>
        {segment.description && (
          <p className="text-muted-foreground mt-2">{segment.description}</p>
        )}
      </div>

      {segment.bonds.map((bond) => (
        <div key={bond.id} className={cn(!bond.block.isVisible && "opacity-50")}>
          <BlockRenderer
            block={bond.block as any}
            isInteractive={isInteractive}
            userId={userId}
          />
        </div>
      ))}
    </div>
  );
}

function ThemeToggleSmall() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
