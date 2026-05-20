import { z } from "zod";

export const BLOCK_TYPES = [
  "CONTENT", "DETAILS", "FILE", "VIDEO", "TABLE", "LIST",
  "SCHEDULE", "GRADE_DETERMINATION", "COURSE_SYLLABUS", "RESPONSE",
] as const;

export const INTERACTION_MODES = ["INTERACTIVE", "STATIC"] as const;

export const MasterSyllabusSchema = z.object({
  title: z.string().min(1, "Title is required"),
  termId: z.string().optional(),
  interactionMode: z.enum(INTERACTION_MODES).default("INTERACTIVE"),
  isPublished: z.boolean().default(false),
  showProgress: z.boolean().default(true),
  allowPrint: z.boolean().default(true),
});

export const SegmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  isVisible: z.boolean().default(true),
});

export const BlockSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  title: z.string().optional(),
  isVisible: z.boolean().default(true),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const GradingScaleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().default(false),
});

export const GradingScaleGradeSchema = z.object({
  letter: z.string().min(1),
  minPercent: z.number().min(0).max(100),
  maxPercent: z.number().min(0).max(100),
  gpaPoints: z.number().optional(),
});

export type MasterSyllabusInput = z.infer<typeof MasterSyllabusSchema>;
export type SegmentInput = z.infer<typeof SegmentSchema>;
export type BlockInput = z.infer<typeof BlockSchema>;
