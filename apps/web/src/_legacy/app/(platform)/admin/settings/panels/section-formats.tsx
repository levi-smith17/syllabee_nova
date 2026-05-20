"use client";

import * as React from "react";
import { cyanBtn } from "@/components/buttons"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createSectionFormat, deleteSectionFormat, updateSectionFormat } from "../actions";

export function SectionFormatsPanel({
    initialFormats
}: {
    initialFormats: { id: string; label: string }[]
}) {
    const [formats, setFormats] = React.useState(initialFormats);
    const [showAdd, setShowAdd] = React.useState(false);
    const [label, setLabel] = React.useState("");
    const [saving, setSaving] = React.useState(false);
    const [deletingId, setDeletingId] = React.useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editLabel, setEditLabel] = React.useState("");
    const [savingEdit, setSavingEdit] = React.useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const format = await await createSectionFormat(label);
            setFormats((prev) => [...prev, format].sort((a, b) => a.label.localeCompare(b.label)));
            toast.success(`Format "${label}" created.`);
            setLabel("");
            setShowAdd(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create format.");
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveEdit(e: React.FormEvent, id: string) {
        e.preventDefault();
        setSavingEdit(true);
        try {
            const updated = await updateSectionFormat(id, editLabel);
            setFormats((prev) => prev.map((f) => (f.id === id ? updated : f)));
            toast.success("Format updated.");
            setEditingId(null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update format.");
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleDeleteConfirmed() {
        if (!deleteTarget) return;
        const { id, label: lbl } = deleteTarget;
        setDeleteTarget(null);
        setDeletingId(id);
        try {
            await deleteSectionFormat(id);
            setFormats((prev) => prev.filter((f) => f.id !== id));
            toast.success(`Format "${lbl}" deleted.`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete format.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="flex flex-col">
            <div className="bg-primary px-4 pt-4 pb-4 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-primary-foreground">Section Formats</h2>
                    <p className="text-xs text-primary-foreground/70 mt-0.5">Define allowed delivery formats for sections.</p>
                </div>
                {/* Desktop add button — inline, only visible sm+ */}
                <Button
                    size="sm"
                    onClick={() => setShowAdd(true)}
                    className={cn("hidden sm:inline-flex gap-1.5 rounded-none shrink-0", cyanBtn)}
                >
                    <Plus className="h-3.5 w-3.5" /> Add Format
                </Button>
            </div>

            {/* Mobile add button — full width, below header, primary fill */}
            <Button
                onClick={() => setShowAdd(true)}
                className={cn("sm:hidden w-full rounded-none gap-1.5 justify-start text-primary-foreground hover:bg-primary/90", cyanBtn)}
            >
                <Plus className="h-4 w-4" /> Add Format
            </Button>

            {showAdd && (
                <form onSubmit={handleCreate} className="border p-4 space-y-3 bg-muted/40">
                    <div className="space-y-1.5">
                        <Label>Format Label</Label>
                        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Lecture, Online, Hybrid…" className="bg-background rounded-none" required />
                    </div>
                    <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between">
                        <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={() => { setShowAdd(false); setLabel(""); }} disabled={saving}>Cancel</Button>
                        <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Add
                        </Button>
                    </div>
                </form>
            )}

            {formats.length === 0 && !showAdd ? (
                <p className="text-sm text-muted-foreground italic py-3 text-center">No formats defined yet.</p>
            ) : (
                <div>
                    {formats.map((f) =>
                        editingId === f.id ? (
                            <form
                                key={f.id}
                                onSubmit={(e) => handleSaveEdit(e, f.id)}
                                className="flex items-center gap-2 px-4 py-2.5 border-b last:border-b-0 bg-muted/40 w-full overflow-hidden"
                            >
                                <Input
                                    value={editLabel}
                                    onChange={(e) => setEditLabel(e.target.value)}
                                    className="flex-1 min-w-0 h-8 text-sm rounded-none bg-background"
                                    required
                                />
                                <Button type="submit" size="icon" className="h-8 w-8 rounded-none shrink-0" disabled={savingEdit}>
                                    {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none shrink-0 bg-muted/70" onClick={() => setEditingId(null)} disabled={savingEdit}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </form>
                        ) : (
                            <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                                <span className="flex-1 text-sm font-medium">{f.label}</span>
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setEditingId(f.id); setEditLabel(f.label); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => setDeleteTarget({ id: f.id, label: f.label })} disabled={deletingId === f.id}>
                                    {deletingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        )
                    )}
                </div>
            )}

            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete format?</DialogTitle>
                        <DialogDescription>
                            <strong>{deleteTarget?.label}</strong> will be permanently removed. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirmed}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}