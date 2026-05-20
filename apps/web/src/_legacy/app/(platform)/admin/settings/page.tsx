import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { SettingsManager } from "./settings-manager";

export const metadata = { title: "Settings — Syllabee Admin" };

export default async function AdminSettingsPage() {
  const [branding, termLengths, formats, rules, ltiPlatforms, tenantId, clientId, allowedDomain, entraEnabled] = await Promise.all([
    db.branding.findFirst(),
    db.termLength.findMany({ orderBy: { weeks: "asc" } }),
    db.sectionFormat.findMany({ orderBy: { label: "asc" } }),
    db.sectionCodeRule.findMany({ include: { format: true }, orderBy: { digit: "asc" } }),
    db.ltiPlatform.findMany({ orderBy: { name: "asc" } }),
    getConfig("entra_tenant_id"),
    getConfig("entra_client_id"),
    getConfig("entra_allowed_domain"),
    getConfig("entra_enabled"),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <SettingsManager
      branding={{
        institutionName: branding?.institutionName ?? "",
        primaryColor: branding?.primaryColor ?? "#D4A017",
        secondaryColor: branding?.secondaryColor ?? "#ffffff",
        logoUrl: branding?.logoUrl ?? "",
        faviconUrl: branding?.faviconUrl ?? "",
      }}
      entra={{
        tenantId: tenantId ?? "",
        clientId: clientId ?? "",
        allowedDomain: allowedDomain ?? "edisonohio.edu",
        enabled: entraEnabled !== "false",
      }}
      ltiPlatforms={ltiPlatforms.map((p) => ({
        id: p.id,
        name: p.name,
        issuer: p.issuer,
        isActive: p.isActive,
        keyId: p.keyId ?? null,
      }))}
      appUrl={appUrl}
      termLengths={termLengths.map((tl) => ({ id: tl.id, label: tl.label, weeks: tl.weeks }))}
      formats={formats.map((f) => ({ id: f.id, label: f.label }))}
      sectionRules={rules.map((r) => ({ id: r.id, digit: r.digit, formatLabel: r.format.label }))}
    />
  );
}
