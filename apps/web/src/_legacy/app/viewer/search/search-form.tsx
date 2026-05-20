"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/viewer/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by course name, code, or title…"
        autoFocus
      />
      <Button type="submit" size="icon">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
