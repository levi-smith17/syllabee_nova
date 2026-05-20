"use client";

import * as React from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createBlock } from "@/actions/syllabus";

const BLOCK_TYPES = [
  { type: "CONTENT", label: "Content", desc: "Rich text / HTML" },
  { type: "DETAILS", label: "Details", desc: "Collapsible section" },
  { type: "LIST", label: "List", desc: "Bullet or numbered list" },
  { type: "TABLE", label: "Table", desc: "Custom data table" },
  { type: "SCHEDULE", label: "Schedule", desc: "Week-by-week schedule" },
  { type: "GRADE_DETERMINATION", label: "Grade Determination", desc: "Category weights" },
  { type: "COURSE_SYLLABUS", label: "Course Syllabus", desc: "Summary info block" },
  { type: "RESPONSE", label: "Response / Quiz", desc: "Interactive questions" },
  { type: "VIDEO", label: "Video", desc: "Embed a video" },
  { type: "FILE", label: "File", desc: "Downloadable attachment" },
];

interface Props {
  segmentId: string;
  syllabusId: string;
  onBlockCreated: (blockId: string) => void;
}

export function AddBlockMenu({ segmentId, syllabusId, onBlockCreated }: Props) {
  const [loading, setLoading] = React.useState(false);

  async function handleAdd(type: string) {
    setLoading(true);
    const block = await createBlock(segmentId, syllabusId, type);
    onBlockCreated(block.id);
    setLoading(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Block Type
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {BLOCK_TYPES.map((bt) => (
          <DropdownMenuItem
            key={bt.type}
            onClick={() => handleAdd(bt.type)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="text-sm font-medium">{bt.label}</span>
            <span className="text-xs text-muted-foreground">{bt.desc}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
