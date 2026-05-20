/**
 * LTI 1.3 OIDC Login Initiation (Step 1)
 *
 * The LMS hits this endpoint to start the OIDC flow.
 * We validate the request, create a nonce + state, store it,
 * and redirect back to the platform's auth endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPlatform, generateNonce, generateState } from "@/lib/lti";

export async function GET(req: NextRequest) {
  return handleLogin(req);
}

export async function POST(req: NextRequest) {
  return handleLogin(req);
}

async function handleLogin(req: NextRequest) {
  const params =
    req.method === "POST"
      ? Object.fromEntries(await req.formData())
      : Object.fromEntries(req.nextUrl.searchParams);

  const iss = params.iss as string;
  const loginHint = params.login_hint as string;
  const targetLinkUri = params.target_link_uri as string;
  const clientId = (params.client_id as string) ?? undefined;
  const ltiMessageHint = params.lti_message_hint as string | undefined;

  if (!iss || !loginHint || !targetLinkUri) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const platform = await db.ltiPlatform.findFirst({
    where: {
      issuer: iss,
      ...(clientId ? { clientId } : {}),
      isActive: true,
    },
  });

  if (!platform) {
    return NextResponse.json({ error: "Unknown LTI platform" }, { status: 400 });
  }

  const nonce = generateNonce();
  const state = generateState();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.ltiNonce.create({
    data: { platformId: platform.id, nonce, state, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/lti/launch`;

  const authUrl = new URL(platform.authLoginUrl);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("prompt", "none");
  authUrl.searchParams.set("client_id", platform.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("login_hint", loginHint);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  if (ltiMessageHint) authUrl.searchParams.set("lti_message_hint", ltiMessageHint);

  return NextResponse.redirect(authUrl.toString());
}
