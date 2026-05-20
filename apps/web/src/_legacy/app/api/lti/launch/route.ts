/**
 * LTI 1.3 Launch (Step 2)
 *
 * The LMS POSTs the id_token here after OIDC auth.
 * We verify the JWT, validate the nonce, auto-provision the user,
 * and redirect to the appropriate content.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPlatformJwt } from "@/lib/lti";

const LTI_CLAIM_MESSAGE_TYPE = "https://purl.imsglobal.org/spec/lti/claim/message_type";
const LTI_CLAIM_TARGET_LINK_URI = "https://purl.imsglobal.org/spec/lti/claim/target_link_uri";
const LTI_CLAIM_ROLES = "https://purl.imsglobal.org/spec/lti/claim/roles";
const LTI_CLAIM_CONTEXT = "https://purl.imsglobal.org/spec/lti/claim/context";
const LTI_CLAIM_RESOURCE_LINK = "https://purl.imsglobal.org/spec/lti/claim/resource_link";
const LTI_CLAIM_CUSTOM = "https://purl.imsglobal.org/spec/lti/claim/custom";
const LTI_CLAIM_DEEP_LINK_SETTINGS = "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const idToken = form.get("id_token") as string;
  const state = form.get("state") as string;

  if (!idToken || !state) {
    return NextResponse.json({ error: "Missing id_token or state" }, { status: 400 });
  }

  // Decode header to get issuer/client_id before full verification
  let issuer: string;
  let clientId: string;
  try {
    const payloadPart = idToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
    issuer = decoded.iss;
    clientId = decoded.aud instanceof Array ? decoded.aud[0] : decoded.aud;
  } catch {
    return NextResponse.json({ error: "Malformed id_token" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  let platform: Awaited<ReturnType<typeof db.ltiPlatform.findFirst>>;

  try {
    const result = await verifyPlatformJwt(issuer, clientId, idToken);
    payload = result.payload as Record<string, unknown>;
    platform = result.platform;
  } catch (err) {
    console.error("LTI JWT verification failed:", err);
    return NextResponse.json({ error: "JWT verification failed" }, { status: 401 });
  }

  if (!platform) {
    return NextResponse.json({ error: "Platform not found" }, { status: 400 });
  }

  // Validate state/nonce
  const nonce = payload.nonce as string;
  const stored = await db.ltiNonce.findFirst({
    where: { platformId: platform.id, nonce, state },
  });
  if (!stored || stored.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired nonce" }, { status: 401 });
  }
  // Delete nonce — one-time use
  await db.ltiNonce.delete({ where: { id: stored.id } });

  const messageType = payload[LTI_CLAIM_MESSAGE_TYPE] as string;
  const targetLinkUri = payload[LTI_CLAIM_TARGET_LINK_URI] as string;
  const roles = (payload[LTI_CLAIM_ROLES] as string[]) ?? [];
  const sub = payload.sub as string;
  const email = payload.email as string | undefined;
  const name = payload.name as string | undefined;
  const context = payload[LTI_CLAIM_CONTEXT] as any;
  const resourceLink = payload[LTI_CLAIM_RESOURCE_LINK] as any;

  // Auto-provision user
  let userId: string | undefined;
  if (email) {
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name,
          role: roles.some((r) =>
            r.includes("Instructor") || r.includes("TeachingAssistant")
          )
            ? "INSTRUCTOR"
            : "STUDENT",
        },
      });
    }
    userId = user.id;
  }

  // Log the launch
  await db.ltiLaunch.create({
    data: {
      platformId: platform.id,
      userId,
      sub,
      contextId: context?.id,
      resourceLinkId: resourceLink?.id,
      roles,
      targetUrl: targetLinkUri,
      customParams: (payload[LTI_CLAIM_CUSTOM] as object) ?? {},
    },
  });

  // Handle deep linking
  if (messageType === "LtiDeepLinkingRequest") {
    const dlSettings = payload[LTI_CLAIM_DEEP_LINK_SETTINGS] as any;
    const token = await db.ltiDeepLink.create({
      data: {
        platformId: platform.id,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        returnUrl: dlSettings.deep_link_return_url,
        deploymentId: platform.deploymentId,
      },
    });

    // Redirect to deep-link selection UI
    const url = new URL(`${appUrl}/lti/deep-link`);
    url.searchParams.set("token", token.token);
    return NextResponse.redirect(url.toString());
  }

  // Regular launch — redirect to the target URL (or viewer)
  const redirectTo = targetLinkUri.startsWith(appUrl)
    ? targetLinkUri
    : `${appUrl}/viewer/search`;

  return NextResponse.redirect(redirectTo);
}
