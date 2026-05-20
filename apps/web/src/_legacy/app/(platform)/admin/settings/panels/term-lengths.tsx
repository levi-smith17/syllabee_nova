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
import { createTermLength, deleteTermLength, updateTermLength } from "../actions";

export function TermLengthsPanel({
    initialTermLengths
}: {
    initialTermLengths: { id: string; label: string; weeks: number }[]
}) {
    const [termLengths, setTermLengths] = React.useState(initialTermLengths);
    const [showAdd, setShowAdd] = React.useState(false);
    const [form, setForm] = React.useState({ label: "", weeks: 16 });
    const [saving, setSaving] = React.useState(false);
    const [deletingId, setDeletingId] = React.useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; label: string } | null>(null);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editForm, setEditForm] = React.useState({ label: "", weeks: 16 });
    const [savingEdit, setSavingEdit] = React.useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const term_length = await createTermLength({ label: form.label, weeks: Number(form.weeks) });
            setTermLengths((prev) => [...prev, term_length].sort((a, b) => a.weeks - b.weeks));
            toast.success("Term length added.");
            setForm({ label: "", weeks: 16 });
            setShowAdd(false);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create term length.");
        } finally {
            setSaving(false);
        }
    }

    function startEdit(tl: (typeof initialTermLengths)[number]) {
        setEditingId(tl.id);
        setEditForm({ label: tl.label, weeks: tl.weeks });
    }

    async function handleSaveEdit(e: React.FormEvent, id: string) {
        e.preventDefault();
        setSavingEdit(true);
        try {
            const updated = await updateTermLength(id, { label: editForm.label, weeks: Number(editForm.weeks) });
            setTermLengths((prev) => prev.map((tl) => (tl.id === id ? updated : tl)));
            toast.success("Term length updated.");
            setEditingId(null);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update term length.");
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleDeleteConfirmed() {
        if (!deleteTarget) return;
        const { id, label } = deleteTarget;
        setDeleteTarget(null);
        setDeletingId(id);
        try {
            await deleteTermLength(id);
            setTermLengths((prev) => prev.filter((tl) => tl.id !== id));
            toast.success(`"${label}" deleted.`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete term length.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="flex flex-col">
            <div className="bg-primary px-4 pt-4 pb-4 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-primary-foreground">Term Lengths</h2>
                    <p className="text-xs text-primary-foreground/70 mt-0.5">Define session durations used when creating terms.</p>
                </div>
                {/* Desktop add button — inline, only visible sm+ */}
                <Button
                    size="sm"
                    onClick={() => setShowAdd(true)}
                    className={cn("hidden sm:inline-flex gap-1.5 rounded-none shrink-0", cyanBtn)}
                >
                    <Plus className="h-3.5 w-3.5" /> Add Term Length
                </Button>
            </div>

            {/* Mobile add button — full width, below header, primary fill */}
            <Button
                onClick={() => setShowAdd(true)}
                className={cn("sm:hidden w-full rounded-none gap-1.5 justify-start text-primary-foreground hover:bg-primary/90", cyanBtn)}
            >
                <Plus className="h-4 w-4" /> Add Term Length
            </Button>

            {showAdd && (
                <form onSubmit={handleCreate} className="border-b p-4 space-y-3 bg-muted/40">
                    <div className="grid md:grid-cols-[1fr_100px] gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="tl-label">Label</Label>
                            <Input id="tl-label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="16-week" className="rounded-none bg-background" required />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="tl-weeks">Weeks</Label>
                            <Input id="tl-weeks" type="number" min={1} value={form.weeks} onChange={(e) => setForm((f) => ({ ...f, weeks: Number(e.target.value) }))} className="rounded-none bg-background" required />
                        </div>
                    </div>
                    <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between">
                        <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={() => { setShowAdd(false); setForm({ label: "", weeks: 16 }); }} disabled={saving}>Cancel</Button>
                        <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Add
                        </Button>
                    </div>
                </form>
            )}

            {termLengths.length === 0 && !showAdd ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">No term lengths defined yet.</p>
            ) : (
                <div>
                    {termLengths.map((tl) =>
                        editingId === tl.id ? (
                            <form
                                key={tl.id}
                                onSubmit={(e) => handleSaveEdit(e, tl.id)}
                                className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40 w-full overflow-hidden"
                            >
                                <Input
                                    value={editForm.label}
                                    onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                                    className="flex-1 h-8 text-sm rounded-none bg-background"
                                    required
                                />
                                <Input
                                    type="number"
                                    min={1}
                                    value={editForm.weeks}
                                    onChange={(e) => setEditForm((f) => ({ ...f, weeks: Number(e.target.value) }))}
                                    className="w-20 h-8 text-sm rounded-none shrink-0 bg-background"
                                    required
                                />
                                <span className="text-xs text-muted-foreground shrink-0">wks</span>
                                <Button type="submit" size="icon" className="h-8 w-8 rounded-none shrink-0" disabled={savingEdit}>
                                    {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-none shrink-0 bg-muted/70" onClick={() => setEditingId(null)} disabled={savingEdit}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </form>
                        ) : (
                            <div key={tl.id} className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                                <span className="flex-1 text-sm font-medium">{tl.label}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{tl.weeks} weeks</span>
                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startEdit(tl)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => setDeleteTarget({ id: tl.id, label: tl.label })} disabled={deletingId === tl.id}>
                                    {deletingId === tl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        )
                    )}
                </div>
            )}

            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete term length?</DialogTitle>
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