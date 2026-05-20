/**
 * System configuration helpers — read/write values from the `system_config`
 * table. Sensitive values (Entra ID secret) are stored encrypted.
 */

import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encrypt";

const SENSITIVE_KEYS = ["entra_client_secret"] as const;

export async function getConfig(key: string): Promise<string | null> {
  const row = await db.systemConfig.findUnique({ where: { key } });
  if (!row) return null;
  if ((SENSITIVE_KEYS as readonly string[]).includes(key)) {
    try {
      return await decrypt(row.value);
    } catch {
      return null;
    }
  }
  return row.value;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const stored = (SENSITIVE_KEYS as readonly string[]).includes(key)
    ? await encrypt(value)
    : value;
  await db.systemConfig.upsert({
    where: { key },
    update: { value: stored },
    create: { key, value: stored },
  });
}

export async function getEntraConfig() {
  const [tenantId, clientId, clientSecret, allowedDomain, enabled] =
    await Promise.all([
      getConfig("entra_tenant_id"),
      getConfig("entra_client_id"),
      getConfig("entra_client_secret"),
      getConfig("entra_allowed_domain"),
      getConfig("entra_enabled"),
    ]);

  // Fall back to environment variables if DB not configured yet
  return {
    tenantId: tenantId ?? process.env.ENTRA_TENANT_ID ?? "",
    clientId: clientId ?? process.env.ENTRA_CLIENT_ID ?? "",
    clientSecret: clientSecret ?? process.env.ENTRA_CLIENT_SECRET ?? "",
    allowedDomain:
      allowedDomain ?? process.env.ENTRA_ALLOWED_DOMAIN ?? "edisonohio.edu",
    enabled: enabled !== null ? enabled === "true" : true,
  };
}
