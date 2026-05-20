import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getEntraConfig } from "@/lib/config";
import { authConfig } from "@/auth.config";
import type { NextAuthConfig } from "next-auth";

/**
 * Build NextAuth providers at request time so Entra ID config is always
 * current (read from DB / env vars on each auth request).
 */
async function buildProviders() {
  const entra = await getEntraConfig();

  const providers = [
    CredentialsProvider({
      id: "credentials",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || user.role !== "ADMIN" || !user.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ];

  if (entra.enabled && entra.tenantId && entra.clientId && entra.clientSecret) {
    providers.push(
      MicrosoftEntraID({
        clientId: entra.clientId,
        clientSecret: entra.clientSecret,
        issuer: `https://login.microsoftonline.com/${entra.tenantId}/v2.0`,
        authorization: {
          params: { scope: "openid profile email User.Read" },
        },
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: null,
          };
        },
      }) as any
    );
  }

  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const providers = await buildProviders();
  const entra = await getEntraConfig();

  return {
    ...authConfig,
    adapter: PrismaAdapter(db),
    providers,
    callbacks: {
      async signIn({ user, account, profile }) {
        // Entra ID: enforce allowed domain
        if (account?.provider === "microsoft-entra-id") {
          const email = user.email ?? "";
          if (entra.allowedDomain && !email.endsWith(`@${entra.allowedDomain}`)) {
            return false;
          }
          // Auto-provision user if not yet in DB
          const existing = await db.user.findUnique({ where: { email } });
          if (!existing) {
            await db.user.create({
              data: {
                email,
                name: user.name,
                role: "STUDENT",
                isActive: true,
              },
            });
          }
        }
        return true;
      },

      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.role = (user as any).role;
        }
        // Refresh role from DB on each token refresh
        if (token.id && !token.role) {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          token.role = dbUser?.role;
        }
        return token;
      },

      async session({ session, token }) {
        if (token) {
          session.user.id = token.id as string;
          (session.user as any).role = token.role;
        }
        return session;
      },
    },
  } satisfies NextAuthConfig;
});
