/**
 * LTI Deep Linking — builds and returns the JWT response to the LMS
 * after the instructor selects a syllabus in the deep-link UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToolJwt } from "@/lib/lti";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, sectionHash, title } = body as {
    token: string;
    sectionHash: string;
    title: string;
  };

  const link = await db.ltiDeepLink.findUnique({ where: { token } });
  if (!link || link.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired deep-link token" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const viewerUrl = `${appUrl}/viewer/s/${sectionHash}`;

  const platform = await db.ltiPlatform.findUnique({ where: { id: link.platformId } });
  if (!platform) {
    return NextResponse.json({ error: "Platform not found" }, { status: 400 });
  }

  const contentItems = [
    {
      type: "ltiResourceLink",
      title,
      url: viewerUrl,
      presentation: { documentTarget: "window" },
    },
  ];

  const jwtPayload = {
    iss: appUrl,
    aud: platform.issuer,
    sub: platform.clientId,
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": link.deploymentId,
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": contentItems,
  };

  const jwt = await signToolJwt(platform.id, jwtPayload);

  // Delete the one-time token
  await db.ltiDeepLink.delete({ where: { token } });

  return NextResponse.json({ jwt, returnUrl: link.returnUrl });
}
