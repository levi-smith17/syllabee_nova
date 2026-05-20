/**
 * Minimal NextAuth config used in the Edge proxy.
 * Must NOT import Prisma, pg, or any Node.js-only module.
 * JWT is verified using the AUTH_SECRET — no DB round-trips.
 */
import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/lti",
  "/.well-known",
  "/viewer",
  "/print",
  "/lti",
];

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // providers live in auth.ts — not needed for route guarding
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

      if (!isPublic && !isLoggedIn) return false; // redirects to signIn page
      if (isLoggedIn && path === "/login") {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
