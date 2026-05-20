"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { togglePublished, deleteSegment, deleteBlock } from "@/actions/syllabus";
import { SyllabusSettingsForm } from "./syllabus-settings-form";
import { SegmentForm } from "./segment-form";
import { BlockPanel } from "./block-panel";
import { AddBlockMenu } from "./add-block-menu";
import type { Block, Bond, MasterBond, MasterSyllabus, Segment, Term } from "@prisma/client";

type FullSyllabus = MasterSyllabus & {
  term: Term | null;
  masterBonds: (MasterBond & {
    segment: Segment & {
      bonds: (Bond & { block: Block })[];
    };
  })[];
};

type RightPanelView =
  | { type: "syllabus-settings" }
  | { type: "segment-view"; segmentId: string }
  | { type: "segment-edit"; segmentId: string }
  | { type: "block-edit"; segmentId: string; blockId: string }
  | { type: "block-add"; segmentId: string }
  | null;

interface Props {
  syllabus: FullSyllabus;
  terms: { id: string; name: string; code: string }[];
  activeSegmentId?: string;
  activeBlockId?: string;
  editMode?: string;
}

export function SyllabusEditorShell({
  syllabus,
  terms,
  activeSegmentId,
  activeBlockId,
  editMode,
}: Props) {
  const router = useRouter();

  // Determine initial right panel view from URL params
  const initialView = React.useMemo<RightPanelView>(() => {
    if (editMode === "syllabus") return { type: "syllabus-settings" };
    if (activeBlockId && activeSegmentId)
      return { type: "block-edit", segmentId: activeSegmentId, blockId: activeBlockId };
    if (activeSegmentId && editMode === "segment")
      return { type: "segment-edit", segmentId: activeSegmentId };
    if (activeSegmentId)
      return { type: "segment-view", segmentId: activeSegmentId };
    return null;
  }, [activeSegmentId, activeBlockId, editMode]);

  const [rightPanel, setRightPanel] = React.useState<RightPanelView>(initialView);

  const activeSegment =
    rightPanel && "segmentId" in rightPanel
      ? syllabus.masterBonds.find(
          (mb) => mb.segment.id === rightPanel.segmentId
        )?.segment
      : null;

  const activeBlock =
    rightPanel?.type === "block-edit" && activeSegment
      ? activeSegment.bonds.find((b) => b.block.id === rightPanel.blockId)
          ?.block
      : null;

  return (
    <div className="flex h-full">
      {/* ── LEFT: TOC ───────────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r bg-muted/20 overflow-y-auto">
        {/* Syllabus header */}
        <div className="flex items-start gap-2 p-4 border-b">
          <Link href="/editor" className="mt-0.5 shrink-0">
            <ChevronLeft className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">
              {syllabus.title}
            </p>
            {syllabus.term && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {syllabus.term.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setRightPanel({ type: "syllabus-settings" })}
              title="Syllabus settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                togglePublished(syllabus.id, !syllabus.isPublished)
              }
              title={syllabus.isPublished ? "Unpublish" : "Publish"}
            >
              {syllabus.isPublished ? (
                <Eye className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Viewer link */}
        <div className="px-4 py-2 border-b">
          <Link
            href={`/viewer/s/${syllabus.id}`}
            target="_blank"
            className="text-xs text-primary hover:underline"
          >
            Preview viewer →
          </Link>
        </div>

        {/* Segments list */}
        <nav className="flex-1 py-2">
          {syllabus.masterBonds.map((mb) => {
            const seg = mb.segment;
            const isActive =
              rightPanel &&
              "segmentId" in rightPanel &&
              rightPanel.segmentId === seg.id;

            return (
              <div key={seg.id} className="group">
                <button
                  onClick={() =>
                    setRightPanel({ type: "segment-view", segmentId: seg.id })
                  }
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors hover:bg-muted/50",
                    isActive && "bg-muted font-medium"
                  )}
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                  <span className="flex-1 truncate">{seg.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {seg.bonds.length}
                  </span>
                  <SegmentActions
                    segmentId={seg.id}
                    syllabusId={syllabus.id}
                    onEdit={() =>
                      setRightPanel({
                        type: "segment-edit",
                        segmentId: seg.id,
                      })
                    }
                  />
                </button>

                {/* Blocks sub-list when segment is active */}
                {isActive &&
                  seg.bonds.map((bond) => {
                    const isBlockActive =
                      rightPanel?.type === "block-edit" &&
                      rightPanel.blockId === bond.block.id;
                    return (
                      <button
                        key={bond.block.id}
                        onClick={() =>
                          setRightPanel({
                            type: "block-edit",
                            segmentId: seg.id,
                            blockId: bond.block.id,
                          })
                        }
                        className={cn(
                          "w-full flex items-center gap-2 pl-10 pr-4 py-1.5 text-xs text-left transition-colors hover:bg-muted/50",
                          isBlockActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <BlockTypeIcon type={bond.block.type} />
                        <span className="flex-1 truncate">
                          {bond.block.title ||
                            blockTypeLabel(bond.block.type as string)}
                        </span>
                        {!bond.block.isVisible && (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}

                {/* Add block button under active segment */}
                {isActive && (
                  <div className="pl-10 pr-4 py-1.5">
                    <AddBlockMenu
                      segmentId={seg.id}
                      syllabusId={syllabus.id}
                      onBlockCreated={(blockId) =>
                        setRightPanel({
                          type: "block-edit",
                          segmentId: seg.id,
                          blockId,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Add segment */}
        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => {
              // Create a new segment via the right panel form
              setRightPanel({ type: "segment-edit", segmentId: "__new__" });
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Segment
          </Button>
        </div>
      </div>

      {/* ── RIGHT: Content / Form ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {rightPanel === null && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
            <p className="text-sm">Select a segment or block to view or edit.</p>
          </div>
        )}

        {rightPanel?.type === "syllabus-settings" && (
          <SyllabusSettingsForm
            syllabus={syllabus}
            terms={terms}
            onDone={() => setRightPanel(null)}
          />
        )}

        {(rightPanel?.type === "segment-view" ||
          rightPanel?.type === "segment-edit") &&
          activeSegment && (
            <SegmentForm
              segment={
                rightPanel.segmentId === "__new__" ? null : activeSegment
              }
              syllabusId={syllabus.id}
              editing={rightPanel.type === "segment-edit"}
              onSwitchToEdit={() =>
                setRightPanel({
                  type: "segment-edit",
                  segmentId: rightPanel.segmentId,
                })
              }
              onDone={() =>
                setRightPanel({
                  type: "segment-view",
                  segmentId: rightPanel.segmentId,
                })
              }
            />
          )}

        {rightPanel?.type === "segment-edit" &&
          rightPanel.segmentId === "__new__" && (
            <SegmentForm
              segment={null}
              syllabusId={syllabus.id}
              editing={true}
              onSwitchToEdit={() => {}}
              onDone={() => setRightPanel(null)}
            />
          )}

        {rightPanel?.type === "block-edit" && activeBlock && activeSegment && (
          <BlockPanel
            block={activeBlock}
            segment={activeSegment}
            syllabusId={syllabus.id}
            onBack={() =>
              setRightPanel({
                type: "segment-view",
                segmentId: rightPanel.segmentId,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SegmentActions({
  segmentId,
  syllabusId,
  onEdit,
}: {
  segmentId: string;
  syllabusId: string;
  onEdit: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => deleteSegment(segmentId, syllabusId)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BlockTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    CONTENT: "¶",
    DETAILS: "›",
    FILE: "📎",
    VIDEO: "▶",
    TABLE: "⊞",
    LIST: "•",
    SCHEDULE: "📅",
    GRADE_DETERMINATION: "%",
    COURSE_SYLLABUS: "ℹ",
    RESPONSE: "?",
  };
  return (
    <span className="shrink-0 w-3.5 text-center text-muted-foreground">
      {icons[type] ?? "·"}
    </span>
  );
}

function blockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CONTENT: "Content",
    DETAILS: "Details",
    FILE: "File",
    VIDEO: "Video",
    TABLE: "Table",
    LIST: "List",
    SCHEDULE: "Schedule",
    GRADE_DETERMINATION: "Grade Determination",
    COURSE_SYLLABUS: "Course Syllabus",
    RESPONSE: "Response",
  };
  return labels[type] ?? type;
}
