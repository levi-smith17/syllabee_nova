"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toggleSectionActive } from "./actions";

export function SectionToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [active, setActive] = React.useState(isActive);
  const [loading, setLoading] = React.useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      await toggleSectionActive(id, !active);
      setActive((a) => !a);
    } catch {
      toast.error("Failed to update section.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 px-2 text-xs"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : active ? (
        "Deactivate"
      ) : (
        "Activate"
      )}
    </Button>
  );
}
