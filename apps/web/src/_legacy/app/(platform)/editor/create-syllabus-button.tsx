"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMasterSyllabus } from "@/actions/syllabus";

export function CreateSyllabusButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleCreate() {
    setLoading(true);
    const fd = new FormData();
    fd.set("title", "Untitled Syllabus");
    fd.set("interactionMode", "INTERACTIVE");
    fd.set("isPublished", "false");
    fd.set("showProgress", "true");
    fd.set("allowPrint", "true");
    const syllabus = await createMasterSyllabus(fd);
    router.push(`/editor/${syllabus.id}`);
  }

  return (
    <Button onClick={handleCreate} disabled={loading} size="sm">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      New Syllabus
    </Button>
  );
}
