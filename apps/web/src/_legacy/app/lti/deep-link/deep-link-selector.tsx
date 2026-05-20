"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Section = {
  id: string;
  hash: string;
  course: { code: string; title: string };
  term: { name: string };
};

interface Props {
  sections: Section[];
  token: string;
}

export function DeepLinkSelector({ sections, token }: Props) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleEmbed() {
    if (!selected) return;
    const section = sections.find((s) => s.id === selected);
    if (!section) return;

    setLoading(true);
    const res = await fetch("/api/lti/deep-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        sectionHash: section.hash,
        title: `${section.course.code} Syllabus`,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert("Failed to create deep link: " + data.error);
      setLoading(false);
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = data.returnUrl;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "JWT";
    input.value = data.jwt;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-xl border max-h-[60vh] overflow-y-auto">
        {sections.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-muted-foreground">
            No published syllabi available.
          </p>
        ) : (
          sections.map((section) => (
            <label
              key={section.id}
              className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                selected === section.id ? "bg-primary/5 border-l-2 border-primary" : ""
              }`}
            >
              <input
                type="radio"
                name="section"
                value={section.id}
                checked={selected === section.id}
                onChange={() => setSelected(section.id)}
                className="accent-primary"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {section.course.code} — {section.course.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {section.term.name}
                </p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleEmbed} disabled={!selected || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Embed Syllabus
        </Button>
      </div>
    </div>
  );
}
