"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveLoginMethods } from "../actions";

interface LoginMethodsProps {
  initialValues: {
    tenantId: string;
    clientId: string;
    allowedDomain: string;
    enabled: boolean;
  };
}

export function LoginMethodsPanel({ initialValues }: LoginMethodsProps) {
  const [loading, setLoading] = React.useState(false);
  const [values, setValues] = React.useState(initialValues);
  const [clientSecret, setClientSecret] = React.useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await saveLoginMethods({ ...values, clientSecret });
      toast.success("Entra ID settings saved.");
    } catch (err) {
      toast.error("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Header — bg-primary */}
      <div className="bg-primary px-4 pt-4 pb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-primary-foreground">Login Methods</h2>
          <p className="text-xs text-primary-foreground/70 mt-0.5">
            Configure various login methods for this app.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-5">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={values.enabled}
              onChange={(e) => setValues((v) => ({ ...v, enabled: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="enabled">Enable Microsoft Entra ID login</Label>
          </div>

          <div>
            <Label htmlFor="tenantId">Tenant ID</Label>
            <Input
              id="tenantId"
              value={values.tenantId}
              onChange={(e) => setValues((v) => ({ ...v, tenantId: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={!values.enabled}
              className="bg-background rounded-none"
            />
          </div>

          <div>
            <Label htmlFor="clientId">Client ID (App ID)</Label>
            <Input
              id="clientId"
              value={values.clientId}
              onChange={(e) => setValues((v) => ({ ...v, clientId: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={!values.enabled}
              className="bg-background rounded-none"
            />
          </div>

          <div>
            <Label htmlFor="clientSecret">
              Client Secret{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (leave blank to keep existing)
              </span>
            </Label>
            <Input
              id="clientSecret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••"
              disabled={!values.enabled}
              autoComplete="new-password"
              className="bg-background rounded-none"
            />
          </div>

          <div>
            <Label htmlFor="allowedDomain">Allowed Email Domain</Label>
            <Input
              id="allowedDomain"
              value={values.allowedDomain}
              onChange={(e) => setValues((v) => ({ ...v, allowedDomain: e.target.value }))}
              placeholder="edisonohio.edu"
              disabled={!values.enabled}
              className="bg-background rounded-none"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Only users with this email domain will be permitted to sign in.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-end mt-3">
          <Button type="submit" disabled={loading} className="rounded-none">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </form>
    </>
  );
}
