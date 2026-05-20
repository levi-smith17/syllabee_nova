"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  entraEnabled: boolean;
  allowedDomain: string;
};

export function LoginForm({ entraEnabled, allowedDomain }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [showAdmin, setShowAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [adminLoading, setAdminLoading] = React.useState(false);

  async function handleEntraLogin() {
    setLoading(true);
    await signIn("microsoft-entra-id", { callbackUrl: "/" });
  }

  async function handleAdminLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdminLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      callbackUrl: "/",
      redirect: false,
    });
    if (result?.error) {
      setAdminLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Syllabee</h1>
        {entraEnabled && (
          <p className="text-sm text-muted-foreground">
            Sign in with your{" "}
            <span className="font-medium">{allowedDomain}</span> account
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error === "AccessDenied"
            ? `Access denied. Only ${allowedDomain} accounts may sign in.`
            : "Sign in failed. Please try again."}
        </div>
      )}

      <div className="space-y-3">
        {/* Microsoft Entra ID */}
        {entraEnabled && (
          <Button
            className="w-full gap-2"
            onClick={handleEntraLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MicrosoftIcon />
            )}
            Sign in with Microsoft
          </Button>
        )}

        {/* Admin toggle */}
        <button
          type="button"
          onClick={() => setShowAdmin((s) => !s)}
          className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          {showAdmin ? "Hide admin login" : "Admin login"}
        </button>

        {showAdmin && (
          <form onSubmit={handleAdminLogin} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={adminLoading}>
              {adminLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign In
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
