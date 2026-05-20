import { Suspense } from "react";
import { getEntraConfig } from "@/lib/config";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign In — Syllabee" };

export default async function LoginPage() {
  const entra = await getEntraConfig();
  return (
    <Suspense>
      <LoginForm entraEnabled={entra.enabled} allowedDomain={entra.allowedDomain} />
    </Suspense>
  );
}
