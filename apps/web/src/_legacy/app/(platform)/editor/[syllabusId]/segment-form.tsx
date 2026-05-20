"use client";

import * as React from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSegment, updateSegment } from "@/actions/syllabus";
import type { Segment } from "@prisma/client";

interface Props {
  segment: Segment | null; // null = create new
  syllabusId: string;
  editing: boolean;
  onSwitchToEdit: () => void;
  onDone: () => void;
}

export function SegmentForm({
  segment,
  syllabusId,
  editing,
  onSwitchToEdit,
  onDone,
}: Props) {
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    if (segment) {
      await updateSegment(segment.id, syllabusId, fd);
    } else {
      await createSegment(syllabusId, fd);
    }
    setLoading(false);
    onDone();
  }

  if (!editing && segment) {
    return (
      <div className="max-w-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{segment.title}</h2>
          <Button variant="ghost" size="icon" onClick={onSwitchToEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        {segment.description && (
          <p className="text-sm text-muted-foreground">{segment.description}</p>
        )}
        {!segment.isVisible && (
          <p className="text-xs text-muted-foreground mt-3 italic">
            This segment is hidden from students.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">
          {segment ? "Edit Segment" : "New Segment"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onDone}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="seg-title">Title</Label>
          <Input
            id="seg-title"
            name="title"
            defaultValue={segment?.title ?? ""}
            placeholder="e.g. Course Policies"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="seg-desc">Description (optional)</Label>
          <textarea
            id="seg-desc"
            name="description"
            defaultValue={segment?.description ?? ""}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            placeholder="Brief description visible in the viewer…"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="isVisible"
            value="true"
            defaultChecked={segment?.isVisible ?? true}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-sm">Visible to students</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {segment ? "Save" : "Create Segment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
