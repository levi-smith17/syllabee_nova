"use client";

import * as React from "react";
import { cyanBtn } from "@/components/buttons"
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createSectionCodeRule, deleteSectionCodeRule, updateSectionCodeRule } from "../actions";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function SectionRulesPanel({
  initialFormats,
  initialRules,
}: {
  initialFormats: { id: string; label: string }[];
  initialRules: { id: string; digit: string; formatLabel: string }[];
}) {
  const [formats] = React.useState(initialFormats);
  const [rules, setRules] = React.useState(initialRules);

  // Add state
  const [showAddRule, setShowAddRule] = React.useState(false);
  const [ruleDigit, setRuleDigit] = React.useState("");
  const [ruleFormatId, setRuleFormatId] = React.useState("");
  const [savingRule, setSavingRule] = React.useState(false);

  // Edit state
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingFormatId, setEditingFormatId] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Delete state
  const [deletingRuleId, setDeletingRuleId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; digit: string } | null>(null);

  const assignedDigits = new Set(rules.map((r) => r.digit));
  const availableDigits = DIGITS.filter((d) => !assignedDigits.has(d));
  const canAdd = availableDigits.length > 0 && formats.length > 0;

  function startEdit(rule: { id: string; digit: string; formatLabel: string }) {
    const fId = formats.find((f) => f.label === rule.formatLabel)?.id ?? "";
    setEditingId(rule.id);
    setEditingFormatId(fId);
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setSavingRule(true);
    try {
      const newRule = await createSectionCodeRule(ruleDigit, ruleFormatId);
      setRules((prev) => [...prev, newRule]);
      toast.success(`Rule for digit "${ruleDigit}" created.`);
      setRuleDigit("");
      setRuleFormatId("");
      setShowAddRule(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create rule.");
    } finally {
      setSavingRule(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent, ruleId: string) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const updated = await updateSectionCodeRule(ruleId, editingFormatId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
      toast.success("Rule updated.");
      setEditingId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update rule.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    const { id, digit } = deleteTarget;
    setDeleteTarget(null);
    setDeletingRuleId(id);
    try {
      await deleteSectionCodeRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success(`Rule for digit "${digit}" deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete rule.");
    } finally {
      setDeletingRuleId(null);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header — bg-primary */}
      <div className="bg-primary px-4 pt-4 pb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-primary-foreground">Section Code Rules</h2>
          <p className="text-xs text-primary-foreground/70 mt-0.5">
            Map the first digit of a section code to a format.
          </p>
        </div>
        {/* Desktop add button — inline, only visible sm+ */}
        <Button
          size="sm"
          onClick={() => setShowAddRule(true)}
          disabled={!canAdd}
          className={cn("hidden sm:inline-flex gap-1.5 rounded-none shrink-0", cyanBtn)}
        >
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </Button>
      </div>

      {/* Mobile add button — full width, below header, primary fill */}
      <Button
        onClick={() => setShowAddRule(true)}
        disabled={!canAdd}
        className={cn("sm:hidden w-full rounded-none gap-1.5 justify-start text-primary-foreground hover:bg-primary/90", cyanBtn)}
      >
        <Plus className="h-4 w-4" /> Add Rule
      </Button>

      {/* Add form */}
      {showAddRule && (
        <form onSubmit={handleCreateRule} className="border-b p-4 space-y-3 bg-muted/40">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Digit</Label>
              <select
                value={ruleDigit}
                onChange={(e) => setRuleDigit(e.target.value)}
                className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                <option value="">Select digit…</option>
                {availableDigits.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <select
                value={ruleFormatId}
                onChange={(e) => setRuleFormatId(e.target.value)}
                className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                <option value="">Select format…</option>
                {formats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-none bg-muted/70"
              onClick={() => { setShowAddRule(false); setRuleDigit(""); setRuleFormatId(""); }}
              disabled={savingRule}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="rounded-none" disabled={savingRule}>
              {savingRule && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Add
            </Button>
          </div>
        </form>
      )}

      {/* Rules list */}
      {rules.length === 0 && !showAddRule ? (
        <p className="text-sm text-muted-foreground italic py-6 text-center">No rules defined yet.</p>
      ) : (
        <div>
          {rules.slice().sort((a, b) => a.digit.localeCompare(b.digit)).map((r) =>
            editingId === r.id ? (
              /* Edit row */
              <form
                key={r.id}
                onSubmit={(e) => handleSaveEdit(e, r.id)}
                className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/40 w-full overflow-hidden"
              >
                <span className="font-mono text-sm font-semibold w-6 shrink-0">{r.digit}</span>
                <span className="text-xs text-muted-foreground shrink-0">→</span>
                <select
                  value={editingFormatId}
                  onChange={(e) => setEditingFormatId(e.target.value)}
                  className="flex-1 min-w-0 h-8 border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                >
                  {formats.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 rounded-none shrink-0"
                  disabled={savingEdit}
                >
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none shrink-0 bg-muted/70"
                  onClick={() => setEditingId(null)}
                  disabled={savingEdit}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </form>
            ) : (
              /* Display row */
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b bg-muted/40">
                <span className="font-mono text-sm font-semibold w-6 shrink-0">{r.digit}</span>
                <span className="text-xs text-muted-foreground shrink-0">→</span>
                <span className="flex-1 text-sm">{r.formatLabel}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => startEdit(r)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget({ id: r.id, digit: r.digit })}
                  disabled={deletingRuleId === r.id}
                >
                  {deletingRuleId === r.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          )}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete rule?</DialogTitle>
            <DialogDescription>
              The rule for digit <strong>{deleteTarget?.digit}</strong> will be permanently removed.
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
