"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block } from "@prisma/client";

type FullBlock = Block & {
  scheduleUnits?: any[];
  questions?: any[];
  gradeDetermRows?: any[];
  listItems?: any[];
  fileAttachments?: any[];
};

interface Props {
  block: FullBlock;
  isInteractive: boolean;
  userId: string | null;
}

export function BlockRenderer({ block, isInteractive, userId }: Props) {
  if (!block.isVisible) return null;
  const data = (block.data ?? {}) as Record<string, unknown>;

  switch (block.type as string) {
    case "CONTENT":
      return <ContentBlockView title={block.title} data={data} />;
    case "DETAILS":
      return <DetailsBlockView data={data} />;
    case "VIDEO":
      return <VideoBlockView data={data} />;
    case "LIST":
      return <ListBlockView data={data} />;
    case "TABLE":
      return <TableBlockView data={data} />;
    case "GRADE_DETERMINATION":
      return <GradeDetBlockView rows={block.gradeDetermRows ?? []} data={data} />;
    case "COURSE_SYLLABUS":
      return <CourseSyllabusBlockView data={data} />;
    case "SCHEDULE":
      return <ScheduleBlockView units={block.scheduleUnits ?? []} />;
    case "RESPONSE":
      return (
        <ResponseBlockView
          questions={block.questions ?? []}
          isInteractive={isInteractive}
          blockId={block.id}
          userId={userId}
        />
      );
    case "FILE":
      return <FileBlockView attachments={block.fileAttachments ?? []} />;
    default:
      return null;
  }
}

// ── Content ──────────────────────────────────────────────────────────────────

function ContentBlockView({
  title,
  data,
}: {
  title: string | null;
  data: Record<string, unknown>;
}) {
  return (
    <div>
      {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: (data.html as string) ?? "" }}
      />
    </div>
  );
}

// ── Details ──────────────────────────────────────────────────────────────────

function DetailsBlockView({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        {(data.summary as string) ?? "Details"}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          className="border-t px-4 py-3 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: (data.html as string) ?? "" }}
        />
      )}
    </div>
  );
}

// ── Video ────────────────────────────────────────────────────────────────────

function VideoBlockView({ data }: { data: Record<string, unknown> }) {
  const url = data.url as string;
  if (!url) return null;

  const embedUrl = toEmbedUrl(url);
  return (
    <div className="space-y-2">
      {embedUrl ? (
        <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Video" />
        </div>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">
          Watch video →
        </a>
      )}
      {data.caption ? (
        <p className="text-xs text-muted-foreground">{String(data.caption)}</p>
      ) : null}
    </div>
  );
}

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return null;
}

// ── List ─────────────────────────────────────────────────────────────────────

function ListBlockView({ data }: { data: Record<string, unknown> }) {
  type Item = { id: string; text: string };
  const style = (data.style as string) ?? "bullet";
  const items = (data.items as Item[]) ?? [];

  if (!items.length) return null;

  const Tag = style === "numbered" ? "ol" : "ul";
  return (
    <Tag className={`text-sm pl-5 space-y-1 ${style === "numbered" ? "list-decimal" : "list-disc"}`}>
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </Tag>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────

function TableBlockView({ data }: { data: Record<string, unknown> }) {
  type Cell = { value: string; isHeader?: boolean };
  type Row = { id: string; cells: Cell[] };
  const rows = (data.rows as Row[]) ?? [];
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, ci) =>
                cell.isHeader ? (
                  <th key={ci} className="border px-3 py-2 font-semibold bg-muted text-left">
                    {cell.value}
                  </th>
                ) : (
                  <td key={ci} className="border px-3 py-2">
                    {cell.value}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Grade Determination ───────────────────────────────────────────────────────

function GradeDetBlockView({
  rows,
  data,
}: {
  rows: any[];
  data: Record<string, unknown>;
}) {
  const displayRows = rows.length > 0 ? rows : ((data.rows as any[]) ?? []);
  if (!displayRows.length) return null;

  const total = displayRows.reduce((s: number, r: any) => s + (r.weight || 0), 0);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left font-semibold">Category</th>
          <th className="pb-2 text-right font-semibold">Weight</th>
        </tr>
      </thead>
      <tbody>
        {displayRows.map((row: any) => (
          <tr key={row.id} className="border-b last:border-0">
            <td className="py-2">
              <p>{row.category}</p>
              {row.description && (
                <p className="text-xs text-muted-foreground">{row.description}</p>
              )}
            </td>
            <td className="py-2 text-right">{row.weight}%</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="pt-2 font-semibold">Total</td>
          <td className="pt-2 text-right font-semibold">{total}%</td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── Course Syllabus ───────────────────────────────────────────────────────────

function CourseSyllabusBlockView({ data }: { data: Record<string, unknown> }) {
  const fields = [
    { key: "instructor", label: "Instructor" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "office", label: "Office Location" },
    { key: "officeHours", label: "Office Hours" },
    { key: "meetingTime", label: "Class Meeting Time" },
    { key: "location", label: "Class Location" },
    { key: "credits", label: "Credit Hours" },
  ];

  const populated = fields.filter((f) => data[f.key]);
  if (!populated.length) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
      {populated.map((f) => (
        <div key={f.key}>
          <dt className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {f.label}
          </dt>
          <dd className="mt-0.5">{data[f.key] as string}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Schedule ─────────────────────────────────────────────────────────────────

function ScheduleBlockView({ units }: { units: any[] }) {
  if (!units.length) {
    return <p className="text-sm text-muted-foreground italic">No schedule available.</p>;
  }

  return (
    <div className="space-y-4">
      {units.map((unit: any) => (
        <div key={unit.id} className="rounded-lg border">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
            <span className="font-medium text-sm">Week {unit.weekNum}</span>
            {unit.date && (
              <span className="text-xs text-muted-foreground">
                {new Date(unit.date).toLocaleDateString()}
              </span>
            )}
          </div>
          <ul className="divide-y">
            {(unit.topics ?? []).map((topic: any) => (
              <li key={topic.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1">{topic.topic}</span>
                {topic.reading && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {topic.reading}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Response / Quiz ───────────────────────────────────────────────────────────

function ResponseBlockView({
  questions,
  isInteractive,
  blockId,
  userId,
}: {
  questions: any[];
  isInteractive: boolean;
  blockId: string;
  userId: string | null;
}) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [score, setScore] = React.useState<number | null>(null);

  if (!questions.length) return null;

  if (!isInteractive) {
    return (
      <div className="space-y-4">
        {questions.map((q: any, i: number) => (
          <div key={q.id} className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-3">
              {i + 1}. {q.text}
            </p>
            <ul className="space-y-1">
              {q.choices.map((c: any) => (
                <li key={c.id} className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">○</span>
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  function handleSubmit() {
    let correct = 0;
    questions.forEach((q: any) => {
      const selected = q.choices.find((c: any) => c.id === answers[q.id]);
      if (selected?.isCorrect) correct++;
    });
    setScore(correct);
    setSubmitted(true);
  }

  return (
    <div className="space-y-4">
      {questions.map((q: any, i: number) => (
        <div key={q.id} className="rounded-lg border p-4">
          <p className="text-sm font-medium mb-3">
            {i + 1}. {q.text}
          </p>
          <div className="space-y-2">
            {q.choices.map((c: any) => {
              const isSelected = answers[q.id] === c.id;
              const showResult = submitted;
              return (
                <label
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                    !submitted && isSelected && "border-primary bg-primary/5",
                    submitted && c.isCorrect && "border-green-500 bg-green-50 dark:bg-green-950",
                    submitted && isSelected && !c.isCorrect && "border-red-500 bg-red-50 dark:bg-red-950"
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={c.id}
                    disabled={submitted}
                    checked={isSelected}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                    className="accent-primary"
                  />
                  {c.text}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Submit Answers
        </button>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 text-sm">
          Score: <strong>{score}</strong> / {questions.length} correct
        </div>
      )}
    </div>
  );
}

// ── File ─────────────────────────────────────────────────────────────────────

function FileBlockView({ attachments }: { attachments: any[] }) {
  if (!attachments.length) return null;

  return (
    <div className="space-y-2">
      {attachments.map((f: any) => (
        <a
          key={f.id}
          href={`/api/files/${f.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
        >
          <span className="text-2xl">📎</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{f.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {(f.fileSize / 1024).toFixed(1)} KB
            </p>
          </div>
          <span className="text-primary text-xs">Download</span>
        </a>
      ))}
    </div>
  );
}
