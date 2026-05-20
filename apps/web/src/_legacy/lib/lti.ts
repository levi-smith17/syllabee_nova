/**
 * LTI 1.3 utility functions.
 *
 * Key migration: existing Blackboard registrations use a specific RSA key pair.
 * Store the PEM values in LtiPlatform.privateKeyPem / publicKeyPem,
 * or fall back to the LTI_PRIVATE_KEY_PEM / LTI_PUBLIC_KEY_PEM env vars.
 */

import { importPKCS8, importSPKI, exportJWK, SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

export async function getPlatform(issuer: string, clientId: string) {
  return db.ltiPlatform.findFirst({
    where: { issuer, clientId, isActive: true },
  });
}

/** Returns the tool's JWKS (public keys) for all active platforms */
export async function getToolJwks() {
  const platforms = await db.ltiPlatform.findMany({
    where: { isActive: true, publicKeyPem: { not: null } },
    select: { publicKeyPem: true, keyId: true },
  });

  const keys: object[] = [];

  for (const p of platforms) {
    if (!p.publicKeyPem) continue;
    try {
      const key = await importSPKI(p.publicKeyPem, "RS256");
      const jwk = await exportJWK(key);
      keys.push({
        ...jwk,
        kid: p.keyId ?? undefined,
        use: "sig",
        alg: "RS256",
      });
    } catch {
      // Skip malformed keys
    }
  }

  // Also include the env var key if set
  if (process.env.LTI_PUBLIC_KEY_PEM) {
    try {
      const key = await importSPKI(
        process.env.LTI_PUBLIC_KEY_PEM.replace(/\\n/g, "\n"),
        "RS256"
      );
      const jwk = await exportJWK(key);
      keys.push({
        ...jwk,
        kid: process.env.LTI_KEY_ID ?? "default",
        use: "sig",
        alg: "RS256",
      });
    } catch {}
  }

  return { keys };
}

/** Sign a JWT with the tool's private key for the given platform */
export async function signToolJwt(
  platformId: string,
  payload: Record<string, unknown>
) {
  const platform = await db.ltiPlatform.findUnique({ where: { id: platformId } });

  const pemRaw =
    platform?.privateKeyPem ??
    process.env.LTI_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n") ??
    null;

  if (!pemRaw) throw new Error("No LTI private key configured");

  const key = await importPKCS8(pemRaw, "RS256");
  const kid =
    platform?.keyId ?? process.env.LTI_KEY_ID ?? "default";

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

/** Verify an id_token sent from the LMS platform */
export async function verifyPlatformJwt(
  issuer: string,
  clientId: string,
  token: string
) {
  const platform = await getPlatform(issuer, clientId);
  if (!platform) throw new Error("Unknown LTI platform");

  // Fetch platform's JWKS to verify the token
  const resp = await fetch(platform.keysetUrl, { next: { revalidate: 3600 } });
  if (!resp.ok) throw new Error("Failed to fetch platform JWKS");
  const jwks = await resp.json();

  // Find the matching key
  const header = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString()
  );
  const platformKey = jwks.keys.find(
    (k: any) => !header.kid || k.kid === header.kid
  );
  if (!platformKey) throw new Error("Matching key not found in platform JWKS");

  const { importJWK } = await import("jose");
  const key = await importJWK(platformKey, "RS256");

  const { payload } = await jwtVerify(token, key, {
    issuer,
    audience: clientId,
  });

  return { payload, platform };
}

/** Generate a cryptographically random nonce */
export function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
}

/** Generate a state value for OIDC */
export function generateState(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
}
