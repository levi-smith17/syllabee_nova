"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { setConfig } from "@/lib/config";
import { z } from "zod";

const TermLengthSchema = z.object({
  label: z.string().min(1),
  weeks: z.coerce.number().int().min(1),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

const LtiPlatformSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1),
  clientId: z.string().min(1),
  deploymentId: z.string().min(1),
  authLoginUrl: z.string().min(1),
  authTokenUrl: z.string().min(1),
  keysetUrl: z.string().min(1),
});

export async function saveBranding(data: {
  institutionName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  faviconUrl: string;
}) {
  await requireAdmin();

  const existing = await db.branding.findFirst();

  if (existing) {
    await db.branding.update({
      where: { id: existing.id },
      data: {
        institutionName: data.institutionName,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        logoUrl: data.logoUrl || null,
        faviconUrl: data.faviconUrl || null,
      },
    });
  } else {
    await db.branding.create({
      data: {
        institutionName: data.institutionName,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        logoUrl: data.logoUrl || null,
        faviconUrl: data.faviconUrl || null,
      },
    });
  }

  revalidatePath("/admin/branding");
}

export async function saveLoginMethods(data: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  allowedDomain: string;
  enabled: boolean;
}) {
  await requireAdmin();
  await Promise.all([
    setConfig("entra_tenant_id", data.tenantId),
    setConfig("entra_client_id", data.clientId),
    setConfig("entra_allowed_domain", data.allowedDomain),
    setConfig("entra_enabled", String(data.enabled)),
    ...(data.clientSecret
      ? [setConfig("entra_client_secret", data.clientSecret)]
      : []),
  ]);
}

export async function createLtiPlatform(data: {
  name: string; issuer: string; clientId: string; deploymentId: string;
  authLoginUrl: string; authTokenUrl: string; keysetUrl: string;
}) {
  await requireAdmin();
  const parsed = LtiPlatformSchema.parse(data);
  const platform = await db.ltiPlatform.create({ data: parsed });
  revalidatePath("/admin/settings");
  return { id: platform.id, name: platform.name, issuer: platform.issuer, isActive: platform.isActive, keyId: platform.keyId };
}

export async function updateLtiPlatform(id: string, data: {
  name: string; issuer: string; clientId: string; deploymentId: string;
  authLoginUrl: string; authTokenUrl: string; keysetUrl: string;
}) {
  await requireAdmin();
  const parsed = LtiPlatformSchema.parse(data);
  const platform = await db.ltiPlatform.update({ where: { id }, data: parsed });
  revalidatePath("/admin/settings");
  return { id: platform.id, name: platform.name, issuer: platform.issuer, isActive: platform.isActive, keyId: platform.keyId };
}

export async function toggleLtiPlatformActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.ltiPlatform.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/settings");
}

export async function deleteLtiPlatform(id: string) {
  await requireAdmin();
  await db.ltiPlatform.delete({ where: { id } });
  revalidatePath("/admin/settings");
}

export async function createSectionFormat(label: string) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");
  const newItem = await db.sectionFormat.create({ data: { label: trimmed } });
  revalidatePath("/admin/section-formats");
  return { id: newItem.id, label: newItem.label };
}

export async function updateSectionFormat(id: string, label: string) {
  await requireAdmin();
  const trimmed = label.trim();
  if (!trimmed) throw new Error("Label is required.");
  const updated = await db.sectionFormat.update({ where: { id }, data: { label: trimmed } });
  revalidatePath("/admin/section-formats");
  return { id: updated.id, label: updated.label };
}

export async function deleteSectionFormat(id: string) {
  await requireAdmin();
  const ruleCount = await db.sectionCodeRule.count({ where: { formatId: id } });
  if (ruleCount > 0) {
    throw new Error("Cannot delete a section format that is assigned to a code rule.");
  }
  const sectionCount = await db.section.count({ where: { formatId: id } })
  if (sectionCount > 0) {
    throw new Error("Cannot delete a section format that is assigned to a section.");
  }
  await db.sectionFormat.delete({ where: { id } });
  revalidatePath("/admin/section-formats");
}

export async function createSectionCodeRule(digit: string, formatId: string) {
  await requireAdmin();
  if (!/^[0-9]$/.test(digit)) throw new Error("Digit must be a single character 0–9.");
  const rule = await db.sectionCodeRule.create({
    data: { digit, formatId },
    include: { format: true },
  });
  revalidatePath("/admin/section-formats");
  return { id: rule.id, digit: rule.digit, formatLabel: rule.format.label };
}

export async function updateSectionCodeRule(id: string, formatId: string) {
  await requireAdmin();
  const rule = await db.sectionCodeRule.update({
    where: { id },
    data: { formatId },
    include: { format: true },
  });
  revalidatePath("/admin/section-formats");
  return { id: rule.id, digit: rule.digit, formatLabel: rule.format.label };
}

export async function deleteSectionCodeRule(id: string) {
  await requireAdmin();
  await db.sectionCodeRule.delete({ where: { id } });
  revalidatePath("/admin/section-formats");
}

export async function createTermLength(data: { label: string; weeks: number }) {
  await requireAdmin();
  const parsed = TermLengthSchema.parse(data);
  const term_length = await db.termLength.create({ data: parsed });
  revalidatePath("/admin/term-lengths");
  return { id: term_length.id, label: term_length.label, weeks: term_length.weeks };
}

export async function updateTermLength(id: string, data: { label: string; weeks: number }) {
  await requireAdmin();
  const parsed = TermLengthSchema.parse(data);
  const term_length = await db.termLength.update({ where: { id }, data: parsed });
  revalidatePath("/admin/term-lengths");
  return { id: term_length.id, label: term_length.label, weeks: term_length.weeks };
}

export async function deleteTermLength(id: string) {
  await requireAdmin();
  const termCount = await db.term.count({ where: { termLengthId: id } });
  if (termCount > 0) {
    throw new Error("Cannot delete a term length that is assigned to terms.");
  }
  await db.termLength.delete({ where: { id } });
  revalidatePath("/admin/term-lengths");
}
