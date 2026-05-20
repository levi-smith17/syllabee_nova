"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createJournalEntry } from "@/actions/internship";

export function JournalEntryForm({ internshipId }: { internshipId: string }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await createJournalEntry(internshipId, new FormData(e.currentTarget));
    setLoading(false);
    setOpen(false);
    formRef.current?.reset();
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Journal Entry
      </Button>
    );
  }

  return (
    <div className="rounded-xl border p-5">
      <h3 className="font-semibold text-sm mb-4">New Journal Entry</h3>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="Summary of today's work" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="entryDate">Date</Label>
            <Input
              id="entryDate"
              name="entryDate"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hoursLogged">Hours</Label>
            <Input
              id="hoursLogged"
              name="hoursLogged"
              type="number"
              min={0.5}
              step={0.5}
              max={24}
              required
              placeholder="4"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            placeholder="Describe what you worked on today…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Entry
          </Button>
        </div>
      </form>
    </div>
  );
}
