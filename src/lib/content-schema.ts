import { z } from "zod";

export const channelSchema = z.enum(["nightly", "preview", "stable", "ga", "unknown"]);
export const categorySchema = z.enum(["feature", "fix", "security", "billing", "deprecation", "breaking", "model", "other"]);
export const scopeSchema = z.enum(["cli", "editor", "api", "organization", "all"]);
export const importanceSchema = z.enum(["must_handle", "worth_trying", "good_to_know"]);
export const sourceLanguageSchema = z.enum(["en", "zh"]);

export const releaseTranslationSchema = z.object({
  sourceLanguage: sourceLanguageSchema.default("en"),
  targetLanguage: sourceLanguageSchema.default("zh"),
  titleEn: z.string().min(1).nullable().default(null),
  bodyEn: z.string().min(1).nullable().default(null),
  titleZh: z.string().min(1),
  bodyZh: z.string().min(1),
  sourceHash: z.string().length(64),
  model: z.string().min(1),
  translatedAt: z.string().datetime(),
});

export const releaseSchema = z.object({
  id: z.string().min(3),
  sourceSlug: z.string().min(2),
  externalId: z.string().min(1),
  version: z.string().nullable(),
  channel: channelSchema,
  publishedAt: z.string().datetime(),
  collectedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  title: z.string().min(1),
  body: z.string().min(1),
  sourceLanguage: sourceLanguageSchema.default("en"),
  contentHash: z.string().length(64),
  sourceTopics: z.array(z.string().min(1)).default([]),
  translation: releaseTranslationSchema.nullable().optional(),
});

export const updateSchema = z.object({
  id: z.string().min(3),
  releaseId: z.string().min(3),
  toolSlug: z.string().min(2),
  toolName: z.string().min(2),
  title: z.string().min(2),
  what: z.string().min(2),
  who: z.string().min(2),
  action: z.string().min(2),
  steps: z.array(z.string()).max(3),
  category: categorySchema,
  scope: scopeSchema,
  importance: importanceSchema,
  channel: channelSchema,
  version: z.string().nullable(),
  publishedAt: z.string().datetime(),
  sourceUrl: z.string().url(),
  evidence: z.string().min(3),
  generatedBy: z.enum(["ai", "fallback"]),
  sourceTopics: z.array(z.string().min(1)).default([]),
});

export const reviewUpdateSchema = updateSchema.extend({ reviewReason: z.string().min(2) });

export const sourceStateSchema = z.object({
  slug: z.string(),
  status: z.enum(["healthy", "degraded", "waiting"]),
  lastSuccessAt: z.string().datetime().nullable(),
  consecutiveErrors: z.number().int().nonnegative(),
  etag: z.string().nullable(),
  lastContentHash: z.string().nullable(),
  lastError: z.string().nullable(),
});

export const digestEntrySchema = z.object({ id: z.string(), reasonZh: z.string() });
export const weeklyDigestSchema = z.object({
  year: z.number().int(),
  week: z.number().int().min(1).max(53),
  generatedAt: z.string().datetime(),
  introZh: z.string(),
  mustHandle: z.array(digestEntrySchema),
  worthTrying: z.array(digestEntrySchema),
  goodToKnow: z.array(digestEntrySchema),
});

export const contentBundleSchema = z.object({
  releases: z.array(releaseSchema),
  updates: z.array(updateSchema),
  review: z.array(reviewUpdateSchema),
  sources: z.array(sourceStateSchema),
  weekly: z.array(weeklyDigestSchema),
});

export type ContentRelease = z.infer<typeof releaseSchema>;
export type ReleaseTranslation = z.infer<typeof releaseTranslationSchema>;
export type ContentUpdate = z.infer<typeof updateSchema>;
export type ReviewUpdate = z.infer<typeof reviewUpdateSchema>;
export type SourceState = z.infer<typeof sourceStateSchema>;
export type WeeklyDigest = z.infer<typeof weeklyDigestSchema>;
export type ContentBundle = z.infer<typeof contentBundleSchema>;
