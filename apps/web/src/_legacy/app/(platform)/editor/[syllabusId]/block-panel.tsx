"use client";

import * as React from "react";
import { ArrowLeft, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBlock, deleteBlock } from "@/actions/syllabus";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import type { Block, Segment } from "@prisma/client";

interface Props {
  block: Block;
  segment: Segment;
  syllabusId: string;
  onBack: () => void;
}

export function BlockPanel({ block, segment, syllabusId, onBack }: Props) {
  const [editing, setEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const data = (block.data ?? {}) as Record<string, unknown>;

  async function handleDelete() {
    if (!confirm("Delete this block?")) return;
    await deleteBlock(block.id, syllabusId, segment.id);
    onBack();
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {segment.title} / {blockTypeLabel(block.type as string)}
          </p>
          <p className="font-medium text-sm truncate">
            {block.title || blockTypeLabel(block.type as string)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!block.isVisible && (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {!editing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Block editor body */}
      <div className="flex-1 overflow-y-auto p-5">
        <BlockEditor
          block={block}
          data={data}
          editing={editing}
          onSaved={() => setEditing(false)}
          syllabusId={syllabusId}
          segmentId={segment.id}
        />
      </div>
    </div>
  );
}

// ── Per-type editor ──────────────────────────────────────────────────────────

function BlockEditor({
  block,
  data,
  editing,
  onSaved,
  syllabusId,
  segmentId,
}: {
  block: Block;
  data: Record<string, unknown>;
  editing: boolean;
  onSaved: () => void;
  syllabusId: string;
  segmentId: string;
}) {
  async function save(newData: Record<string, unknown>, title?: string) {
    await updateBlock(block.id, syllabusId, segmentId, {
      data: newData,
      ...(title !== undefined && { title }),
    });
    onSaved();
  }

  switch (block.type as string) {
    case "CONTENT":
      return (
        <ContentBlockEditor
          data={data}
          title={block.title}
          editing={editing}
          onSave={save}
          onCancel={onSaved}
        />
      );
    case "DETAILS":
      return (
        <DetailsBlockEditor
          data={data}
          title={block.title}
          editing={editing}
          onSave={save}
          onCancel={onSaved}
        />
      );
    case "VIDEO":
      return (
        <VideoBlockEditor
          data={data}
          editing={editing}
          onSave={save}
          onCancel={onSaved}
        />
      );
    case "LIST":
      return (
        <ListBlockEditor
          data={data}
          editing={editing}
          onSave={save}
          onCancel={onSaved}
        />
      );
    case "GRADE_DETERMINATION":
      return (
        <GradeDetBlockEditor
          data={data}
          editing={editing}
          onSave={save}
          onCancel={onSaved}
        />
      );
    case "COURSE_SYLLABUS":
      return (
        <CourseSyllabusBlockEditor
          data={data}
          editing={editing}
          onSave={save}
          onCancel={onSaved}
        />
      );
    case "RESPONSE":
      return (
        <ResponseBlockEditor
          blockId={block.id}
          editing={editing}
          onCancel={onSaved}
        />
      );
    case "FILE":
      return (
        <FileBlockEditor
          blockId={block.id}
          editing={editing}
          onCancel={onSaved}
        />
      );
    case "SCHEDULE":
      return (
        <ScheduleBlockEditor
          blockId={block.id}
          editing={editing}
          onCancel={onSaved}
        />
      );
    case "TABLE":
      return (
        <TableBlockEditor
          data={data}
          editing={editing}
          onSave={save}
          onCancel={onSaved}
        />
      );
    default:
      return <p className="text-sm text-muted-foreground">Unknown block type.</p>;
  }
}

// ── Content Block ────────────────────────────────────────────────────────────

function ContentBlockEditor({
  data,
  title,
  editing,
  onSave,
  onCancel,
}: {
  data: Record<string, unknown>;
  title: string | null;
  editing: boolean;
  onSave: (data: Record<string, unknown>, title?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [blockTitle, setBlockTitle] = React.useState(title ?? "");
  const [content, setContent] = React.useState((data.html as string) ?? "");
  const [loading, setLoading] = React.useState(false);

  if (!editing) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        {title && <h3 className="mt-0">{title}</h3>}
        {content ? (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p className="text-muted-foreground italic">No content yet. Click edit to add.</p>
        )}
      </div>
    );
  }

  async function handleSave() {
    setLoading(true);
    await onSave({ html: content }, blockTitle || undefined);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Block Title (optional)</Label>
        <Input
          value={blockTitle}
          onChange={(e) => setBlockTitle(e.target.value)}
          placeholder="Section heading…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Content</Label>
        <RichTextEditor content={content} onChange={setContent} />
      </div>
      <FormActions
        loading={loading}
        onSave={handleSave}
        onCancel={onCancel}
      />
    </div>
  );
}

// ── Details Block ────────────────────────────────────────────────────────────

function DetailsBlockEditor({
  data,
  title,
  editing,
  onSave,
  onCancel,
}: {
  data: Record<string, unknown>;
  title: string | null;
  editing: boolean;
  onSave: (data: Record<string, unknown>, title?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [summary, setSummary] = React.useState((data.summary as string) ?? title ?? "");
  const [content, setContent] = React.useState((data.html as string) ?? "");
  const [loading, setLoading] = React.useState(false);

  if (!editing) {
    return (
      <details className="border rounded-md">
        <summary className="px-4 py-3 cursor-pointer font-medium text-sm">
          {summary || "Click to expand"}
        </summary>
        <div
          className="px-4 py-3 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </details>
    );
  }

  async function handleSave() {
    setLoading(true);
    await onSave({ summary, html: content }, summary || undefined);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Summary / Toggle Label</Label>
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Click to expand…" />
      </div>
      <div className="space-y-1.5">
        <Label>Content</Label>
        <RichTextEditor content={content} onChange={setContent} />
      </div>
      <FormActions loading={loading} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

// ── Video Block ──────────────────────────────────────────────────────────────

function VideoBlockEditor({
  data,
  editing,
  onSave,
  onCancel,
}: {
  data: Record<string, unknown>;
  editing: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [url, setUrl] = React.useState((data.url as string) ?? "");
  const [caption, setCaption] = React.useState((data.caption as string) ?? "");
  const [loading, setLoading] = React.useState(false);

  if (!editing) {
    const embedUrl = toEmbedUrl(url);
    return (
      <div className="space-y-2">
        {embedUrl ? (
          <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              title="Video"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No video URL set.</p>
        )}
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </div>
    );
  }

  async function handleSave() {
    setLoading(true);
    await onSave({ url, caption });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Video URL (YouTube or Vimeo)</Label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtu.be/…"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Caption (optional)</Label>
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      <FormActions loading={loading} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return null;
}

// ── List Block ───────────────────────────────────────────────────────────────

function ListBlockEditor({
  data,
  editing,
  onSave,
  onCancel,
}: {
  data: Record<string, unknown>;
  editing: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  type ListItem = { id: string; text: string };
  const [style, setStyle] = React.useState<"bullet" | "numbered">(
    (data.style as "bullet" | "numbered") ?? "bullet"
  );
  const [items, setItems] = React.useState<ListItem[]>(
    (data.items as ListItem[]) ?? []
  );
  const [loading, setLoading] = React.useState(false);

  if (!editing) {
    const Tag = style === "numbered" ? "ol" : "ul";
    return items.length ? (
      <Tag className={`text-sm pl-5 space-y-1 ${style === "numbered" ? "list-decimal" : "list-disc"}`}>
        {items.map((it) => <li key={it.id}>{it.text}</li>)}
      </Tag>
    ) : (
      <p className="text-sm text-muted-foreground italic">No items yet.</p>
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text: "" }]);
  }
  function updateItem(id: string, text: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSave() {
    setLoading(true);
    await onSave({ style, items: items.filter((i) => i.text.trim()) });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>List Style</Label>
        <div className="flex gap-3">
          {(["bullet", "numbered"] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="list-style"
                value={s}
                checked={style === s}
                onChange={() => setStyle(s)}
                className="accent-primary"
              />
              {s === "bullet" ? "Bullet" : "Numbered"}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm w-5 text-right shrink-0">
              {style === "numbered" ? `${idx + 1}.` : "•"}
            </span>
            <Input
              value={item.text}
              onChange={(e) => updateItem(item.id, e.target.value)}
              placeholder="List item…"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          Add Item
        </Button>
      </div>
      <FormActions loading={loading} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

// ── Grade Determination Block ─────────────────────────────────────────────────

function GradeDetBlockEditor({
  data,
  editing,
  onSave,
  onCancel,
}: {
  data: Record<string, unknown>;
  editing: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  type Row = { id: string; category: string; weight: number; description: string };
  const [rows, setRows] = React.useState<Row[]>(
    (data.rows as Row[]) ?? []
  );
  const [loading, setLoading] = React.useState(false);

  const total = rows.reduce((s, r) => s + (r.weight || 0), 0);

  if (!editing) {
    return rows.length ? (
      <div className="space-y-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2">
                  <p>{r.category}</p>
                  {r.description && (
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  )}
                </td>
                <td className="py-2 text-right">{r.weight}%</td>
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
      </div>
    ) : (
      <p className="text-sm text-muted-foreground italic">No grade categories yet.</p>
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), category: "", weight: 0, description: "" }]);
  }
  function updateRow(id: string, field: keyof Row, value: string | number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSave() {
    setLoading(true);
    await onSave({ rows });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[1fr_80px_auto] gap-2 items-start">
            <div className="space-y-1.5">
              <Input
                value={row.category}
                onChange={(e) => updateRow(row.id, "category", e.target.value)}
                placeholder="Category name"
              />
              <Input
                value={row.description}
                onChange={(e) => updateRow(row.id, "description", e.target.value)}
                placeholder="Description (optional)"
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={row.weight}
                onChange={(e) => updateRow(row.id, "weight", parseFloat(e.target.value) || 0)}
                className="text-right"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => removeRow(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            Add Category
          </Button>
          <p className={`text-sm font-medium ${total !== 100 ? "text-destructive" : "text-green-600"}`}>
            Total: {total}%
          </p>
        </div>
      </div>
      <FormActions loading={loading} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

// ── Course Syllabus Block ────────────────────────────────────────────────────

function CourseSyllabusBlockEditor({
  data,
  editing,
  onSave,
  onCancel,
}: {
  data: Record<string, unknown>;
  editing: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
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
  const [values, setValues] = React.useState<Record<string, string>>(
    (data as Record<string, string>) ?? {}
  );
  const [loading, setLoading] = React.useState(false);

  if (!editing) {
    const populated = fields.filter((f) => values[f.key]);
    return populated.length ? (
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {populated.map((f) => (
          <div key={f.key}>
            <dt className="font-medium text-muted-foreground text-xs">{f.label}</dt>
            <dd>{values[f.key]}</dd>
          </div>
        ))}
      </dl>
    ) : (
      <p className="text-sm text-muted-foreground italic">No course info yet.</p>
    );
  }

  async function handleSave() {
    setLoading(true);
    await onSave(values);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <Input
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <FormActions loading={loading} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

// ── Table Block ──────────────────────────────────────────────────────────────

function TableBlockEditor({
  data,
  editing,
  onSave,
  onCancel,
}: {
  data: Record<string, unknown>;
  editing: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  type Cell = { value: string; isHeader?: boolean };
  type Row = { id: string; cells: Cell[] };

  const [rows, setRows] = React.useState<Row[]>(
    (data.rows as Row[]) ?? [
      { id: crypto.randomUUID(), cells: [{ value: "", isHeader: true }, { value: "", isHeader: true }] },
    ]
  );
  const [loading, setLoading] = React.useState(false);

  const cols = rows[0]?.cells.length ?? 2;

  if (!editing) {
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

  function updateCell(rowId: string, colIdx: number, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, cells: r.cells.map((c, i) => (i === colIdx ? { ...c, value } : c)) }
          : r
      )
    );
  }
  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), cells: Array.from({ length: cols }, () => ({ value: "" })) },
    ]);
  }
  function addCol() {
    setRows((prev) =>
      prev.map((r, ri) => ({
        ...r,
        cells: [...r.cells, { value: "", isHeader: ri === 0 }],
      }))
    );
  }

  async function handleSave() {
    setLoading(true);
    await onSave({ rows });
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.id}>
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="border p-1">
                    <Input
                      value={cell.value}
                      onChange={(e) => updateCell(row.id, ci, e.target.value)}
                      className={`h-8 min-w-[100px] ${cell.isHeader ? "font-semibold" : ""}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Row</Button>
        <Button type="button" variant="outline" size="sm" onClick={addCol}>+ Column</Button>
      </div>
      <FormActions loading={loading} onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

// ── Schedule Block (stub — complex, managed via server actions) ───────────────

function ScheduleBlockEditor({
  blockId,
  editing,
  onCancel,
}: {
  blockId: string;
  editing: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Schedule management — week units and topics are managed via the schedule editor.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a href={`/editor/schedule/${blockId}`}>Open Schedule Editor</a>
      </Button>
    </div>
  );
}

// ── Response Block (stub — questions managed via server actions) ──────────────

function ResponseBlockEditor({
  blockId,
  editing,
  onCancel,
}: {
  blockId: string;
  editing: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Response questions are managed in the question editor.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a href={`/editor/response/${blockId}`}>Open Question Editor</a>
      </Button>
    </div>
  );
}

// ── File Block (upload handled via API route) ────────────────────────────────

function FileBlockEditor({
  blockId,
  editing,
  onCancel,
}: {
  blockId: string;
  editing: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        File uploads are managed through the attachment manager.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a href={`/editor/files/${blockId}`}>Manage Files</a>
      </Button>
    </div>
  );
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function FormActions({
  loading,
  onSave,
  onCancel,
}: {
  loading: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" size="sm" onClick={onSave} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </div>
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
