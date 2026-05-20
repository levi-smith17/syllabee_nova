"use client";

import * as React from "react";
import { cyanBtn } from "@/components/buttons"
import { Loader2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createLtiPlatform, updateLtiPlatform, toggleLtiPlatformActive, deleteLtiPlatform } from "../actions";

type Platform = { id: string; name: string; issuer: string; isActive: boolean; keyId: string | null };

const EMPTY_FORM = { name: "", issuer: "", clientId: "", deploymentId: "", authLoginUrl: "", authTokenUrl: "", keysetUrl: "" };

function PlatformForm({
  value, onChange, onSubmit, onCancel, saving, submitLabel,
}: {
  value: typeof EMPTY_FORM;
  onChange: (v: typeof EMPTY_FORM) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  const field = (key: keyof typeof EMPTY_FORM, label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label} <span className="text-destructive">*</span></Label>
      <Input
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
        placeholder={placeholder}
        className="h-8 text-sm rounded-none bg-background"
        required
      />
    </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="border-b p-4 space-y-3 bg-muted/40">
      <div className="grid md:grid-cols-2 gap-3">
        {field("name", "Name", "Blackboard — ECC")}
        {field("issuer", "Issuer URL", "https://lms.institution.edu")}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {field("clientId", "Client ID", "abc123")}
        {field("deploymentId", "Deployment ID", "1")}
      </div>
      {field("authLoginUrl", "OIDC Login URL", "https://lms.institution.edu/api/lti/authorize_redirect")}
      {field("authTokenUrl", "Token URL", "https://lms.institution.edu/login/oauth2/token")}
      {field("keysetUrl", "Keyset URL (JWKS)", "https://lms.institution.edu/api/lti/security/jwks")}
      <div className="flex flex-col flex-col-reverse md:flex-row gap-2 justify-between pt-1">
        <Button type="button" variant="ghost" size="sm" className="rounded-none bg-muted/70" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" className="rounded-none" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function LtiPanel({ initialPlatforms, appUrl }: { initialPlatforms: Platform[]; appUrl: string }) {
  const [platforms, setPlatforms] = React.useState(initialPlatforms);
  const [showAdd, setShowAdd] = React.useState(false);
  const [addForm, setAddForm] = React.useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = React.useState(false);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = React.useState(false);

  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleCreate() {
    setAddSaving(true);
    try {
      const created = await createLtiPlatform(addForm);
      setPlatforms((prev) => [...prev, created]);
      toast.success(`"${created.name}" registered.`);
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to register platform.");
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(p: Platform) {
    // We only have partial data in the list; fetch full record via the form state
    // Fields not stored in list state (clientId, deploymentId, URLs) will be blank — user must re-enter.
    setEditingId(p.id);
    setEditForm({ name: p.name, issuer: p.issuer, clientId: "", deploymentId: "", authLoginUrl: "", authTokenUrl: "", keysetUrl: "" });
  }

  async function handleUpdate() {
    if (!editingId) return;
    setEditSaving(true);
    try {
      const updated = await updateLtiPlatform(editingId, editForm);
      setPlatforms((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      toast.success("Platform updated.");
      setEditingId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update platform.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    setTogglingId(id);
    try {
      await toggleLtiPlatformActive(id, !current);
      setPlatforms((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !current } : p)));
    } catch {
      toast.error("Failed to update platform.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(id);
    try {
      await deleteLtiPlatform(id);
      setPlatforms((prev) => prev.filter((p) => p.id !== id));
      toast.success(`"${name}" removed.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete platform.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-primary px-4 pt-4 pb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-primary-foreground">LTI 1.3 Platforms</h2>
          <p className="text-xs text-primary-foreground/70 mt-0.5">Manage LMS registrations (Canvas, Blackboard, etc.)</p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowAdd(true); setEditingId(null); }}
          className={cn("hidden sm:inline-flex gap-1.5 rounded-none shrink-0", cyanBtn)}
        >
          <Plus className="h-3.5 w-3.5" /> Register
        </Button>
      </div>

      <Button
        onClick={() => { setShowAdd(true); setEditingId(null); }}
        className={cn("sm:hidden w-full rounded-none gap-1.5 justify-start text-primary-foreground hover:bg-primary/90", cyanBtn)}
      >
        <Plus className="h-4 w-4" /> Register Platform
      </Button>

      {/* Tool endpoints */}
      <div className="px-4 py-3 bg-muted/40 border-b space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tool Endpoints</p>
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">OIDC Login</dt>
          <dd className="font-mono break-all">{appUrl}/api/lti/login</dd>
          <dt className="text-muted-foreground">Launch / Redirect</dt>
          <dd className="font-mono break-all">{appUrl}/api/lti/launch</dd>
          <dt className="text-muted-foreground">JWKS</dt>
          <dd className="font-mono break-all">{appUrl}/.well-known/jwks.json</dd>
        </dl>
      </div>

      {/* Add form */}
      {showAdd && (
        <PlatformForm
          value={addForm}
          onChange={setAddForm}
          onSubmit={handleCreate}
          onCancel={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }}
          saving={addSaving}
          submitLabel="Register Platform"
        />
      )}

      {/* Platform list */}
      {platforms.length === 0 && !showAdd ? (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No LTI platforms registered yet.</p>
        </div>
      ) : (
        <div>
          {platforms.map((p) =>
            editingId === p.id ? (
              <PlatformForm
                key={p.id}
                value={editForm}
                onChange={setEditForm}
                onSubmit={handleUpdate}
                onCancel={() => setEditingId(null)}
                saving={editSaving}
                submitLabel="Save"
              />
            ) : (
              <div key={p.id} className={cn("flex items-center gap-3 px-4 py-3 border-b bg-muted/40", !p.isActive && "opacity-60")}>
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.issuer}</p>
                </div>
                {!p.isActive && <span className="text-xs text-muted-foreground shrink-0">Disabled</span>}
                {p.keyId && <span className="text-xs text-green-600 dark:text-green-400 font-medium shrink-0">Keys set</span>}
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs shrink-0" onClick={() => handleToggle(p.id, p.isActive)} disabled={togglingId === p.id}>
                  {togglingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.isActive ? "Disable" : "Enable"}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => startEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => setDeleteTarget({ id: p.id, name: p.name })} disabled={deletingId === p.id}>
                  {deletingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          )}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove platform?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently removed. Active LTI launches will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
