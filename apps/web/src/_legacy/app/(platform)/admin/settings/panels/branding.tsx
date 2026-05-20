"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBranding } from "../actions";

interface BrandingProps {
  initialValues: {
    institutionName: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
  };
}

export function BrandingPanel({ initialValues }: BrandingProps) {
  const [loading, setLoading] = React.useState(false);
  const [values, setValues] = React.useState(initialValues);

  function set(field: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await saveBranding(values);
      toast.success("Branding saved.");
    } catch {
      toast.error("Failed to save branding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Header — bg-primary */}
      <div className="bg-primary px-4 pt-4 pb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-primary-foreground">Branding</h2>
          <p className="text-xs text-primary-foreground/70 mt-0.5">
            Adjust the branding settings (app-wide).
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-5">
        <div>
          <Label htmlFor="institutionName">Institution Name</Label>
          <Input
            id="institutionName"
            value={values.institutionName}
            onChange={set("institutionName")}
            placeholder="Edison State Community College"
            required
            className="bg-background rounded-none"
          />
        </div>

        <div className="flex flex-col md:flex-row justify-end mt-3">
          <Button type="submit" disabled={loading} className="rounded-none">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Branding
          </Button>
        </div>
      </form>
    </>
  );
}
