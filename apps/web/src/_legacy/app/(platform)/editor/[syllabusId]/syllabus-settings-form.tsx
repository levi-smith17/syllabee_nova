"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMasterSyllabus, deleteMasterSyllabus } from "@/actions/syllabus";
import type { MasterSyllabus, Term } from "@prisma/client";

interface Props {
  syllabus: MasterSyllabus & { term: Term | null };
  terms: { id: string; name: string; code: string }[];
  onDone: () => void;
}

export function SyllabusSettingsForm({ syllabus, terms, onDone }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await updateMasterSyllabus(syllabus.id, new FormData(e.currentTarget));
    setLoading(false);
    onDone();
  }

  async function handleDelete() {
    if (!confirm("Delete this syllabus? This cannot be undone.")) return;
    setDeleting(true);
    await deleteMasterSyllabus(syllabus.id);
    router.push("/editor");
  }

  return (
    <div className="max-w-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Syllabus Settings</h2>
        <Button variant="ghost" size="icon" onClick={onDone}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={syllabus.title}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="termId">Term (optional)</Label>
          <select
            id="termId"
            name="termId"
            defaultValue={syllabus.termId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— None —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="interactionMode">Interaction Mode</Label>
          <select
            id="interactionMode"
            name="interactionMode"
            defaultValue={syllabus.interactionMode}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="INTERACTIVE">Interactive</option>
            <option value="STATIC">Static</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <CheckField
            name="showProgress"
            label="Show progress tracking"
            defaultChecked={syllabus.showProgress}
          />
          <CheckField
            name="allowPrint"
            label="Allow print / PDF export"
            defaultChecked={syllabus.allowPrint}
          />
          <CheckField
            name="isPublished"
            label="Published (visible in viewer)"
            defaultChecked={syllabus.isPublished}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Syllabus
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onDone}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function CheckField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
