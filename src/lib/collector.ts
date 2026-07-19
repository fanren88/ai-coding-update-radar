import { analyzeRelease, hasAiCredentials, type AnalyzedUpdate } from "./ai";
import { createUpdateAdapter, hashContent } from "./adapters";
import { loadContent, saveContent, stableId } from "./content-store";
import type { ContentBundle, ContentRelease, ContentUpdate, ReviewUpdate, SourceState } from "./content-schema";
import { UPDATE_SOURCES, getUpdateSource, type UpdateSourceSlug } from "./source-config";
import { detectSourceLanguage } from "./translator";
import type { OfficialRelease } from "./types";

export interface CollectOptions {
  sources: UpdateSourceSlug[];
  dryRun?: boolean;
  noAi?: boolean;
  force?: boolean;
  maxReleases?: number;
  contentRoot?: string;
}

export interface CollectResult {
  sourceSlug: string;
  status: "imported" | "unchanged" | "failed";
  fetchedReleases: number;
  newReleases: number;
  publishedUpdates: number;
  reviewUpdates: number;
  error?: string;
}

const risky = (item: AnalyzedUpdate) => ["security", "billing", "deprecation", "breaking"].includes(item.category) || item.importance === "must_handle";
const evidenceFrom = (body: string) => {
  const cleaned = body
    .replace(/^```[\s\S]*?```\s*/i, "")
    .replace(/^\$\s*npm install[^\n]*?\s+(?=View details|Bug Fixes|New Features|Chores|Improvements|[A-Z])/i, "")
    .replace(/^View details\s*/i, "")
    .replace(/^#{1,6}\s*(?:Bug Fixes|New Features|Chores|Improvements(?: and bug fixes)?|Performance improvements and bug fixes)\s*/i, "")
    .replace(/^-\s+/, "")
    .trim();
  return cleaned.split(/(?<=[.!?])\s+/)[0]?.slice(0, 600) || cleaned.slice(0, 600) || body.slice(0, 600);
};

function fallbackAnalysis(release: OfficialRelease, tool: string): AnalyzedUpdate[] {
  return [{
    titleZh: release.title,
    whatChangedZh: `官方发布了「${release.title}」。当前条目直接来自官方更新日志，尚未进行 AI 中文拆分。`,
    whoAffectedZh: `正在使用 ${tool} 的开发者`,
    actionZh: "查看官方原文，根据自己的版本和使用场景决定是否升级。",
    trySteps: [],
    category: "other",
    scope: "all",
    importance: "good_to_know",
    evidenceExcerpt: evidenceFrom(release.body),
  }];
}

function toStoredRelease(slug: UpdateSourceSlug, release: OfficialRelease, collectedAt: string): ContentRelease {
  return {
    id: stableId(slug, release.externalId),
    sourceSlug: slug,
    externalId: release.externalId,
    version: release.version,
    channel: release.channel,
    publishedAt: release.publishedAt.toISOString(),
    collectedAt,
    sourceUrl: release.sourceUrl,
    title: release.title,
    body: release.body,
    sourceLanguage: detectSourceLanguage(`${release.title}\n${release.body}`),
    contentHash: release.contentHash,
    sourceTopics: release.sourceTopics ?? [],
  };
}

function toContentUpdate(stored: ContentRelease, slug: UpdateSourceSlug, item: AnalyzedUpdate, index: number, generatedBy: "ai" | "fallback"): ContentUpdate {
  const source = getUpdateSource(slug)!;
  return {
    id: stableId(stored.id, `${index}:${item.titleZh}`),
    releaseId: stored.id,
    toolSlug: slug,
    toolName: source.tool,
    title: item.titleZh,
    what: item.whatChangedZh,
    who: item.whoAffectedZh,
    action: item.actionZh,
    steps: item.trySteps,
    category: item.category,
    scope: item.scope,
    importance: item.importance,
    channel: stored.channel,
    version: stored.version,
    publishedAt: stored.publishedAt,
    sourceUrl: stored.sourceUrl,
    evidence: item.evidenceExcerpt,
    generatedBy,
    sourceTopics: stored.sourceTopics,
  };
}

function stateFor(bundle: ContentBundle, slug: UpdateSourceSlug): SourceState {
  let state = bundle.sources.find((item) => item.slug === slug);
  if (!state) {
    state = { slug, status: "waiting", lastSuccessAt: null, consecutiveErrors: 0, etag: null, lastContentHash: null, lastError: null };
    bundle.sources.push(state);
  }
  return state;
}

async function analyze(release: OfficialRelease, tool: string, noAi: boolean) {
  if (noAi || !hasAiCredentials()) return { items: fallbackAnalysis(release, tool), generatedBy: "fallback" as const };
  try {
    return { items: await analyzeRelease(release), generatedBy: "ai" as const };
  } catch {
    return { items: fallbackAnalysis(release, tool), generatedBy: "fallback" as const };
  }
}

export async function collectOfficialUpdates(options: CollectOptions): Promise<CollectResult[]> {
  const bundle = await loadContent(options.contentRoot);
  const results: CollectResult[] = [];
  for (const slug of options.sources) {
    const source = getUpdateSource(slug);
    const state = stateFor(bundle, slug);
    if (!source) {
      results.push({ sourceSlug: slug, status: "failed", fetchedReleases: 0, newReleases: 0, publishedUpdates: 0, reviewUpdates: 0, error: "unknown_source" });
      continue;
    }
    try {
      const adapter = createUpdateAdapter(slug);
      const fetched = await adapter.fetch(options.force ? undefined : state.etag);
      if (fetched.status === 304) {
        if (state.status !== "healthy") {
          state.status = "healthy";
          state.lastSuccessAt = fetched.fetchedAt.toISOString();
          state.consecutiveErrors = 0;
          state.lastError = null;
        }
        results.push({ sourceSlug: slug, status: "unchanged", fetchedReleases: 0, newReleases: 0, publishedUpdates: 0, reviewUpdates: 0 });
        continue;
      }
      const parsed = adapter.parse(fetched).slice(0, options.maxReleases ?? 10);
      if (!parsed.length) throw new Error("parser_returned_no_releases");
      const sourceContentHash = hashContent(parsed.map((release) => `${release.externalId}:${release.contentHash}:${(release.sourceTopics ?? []).join(",")}`).join("\n"));
      if (!options.force && sourceContentHash === state.lastContentHash && state.status === "healthy") {
        results.push({ sourceSlug: slug, status: "unchanged", fetchedReleases: parsed.length, newReleases: 0, publishedUpdates: 0, reviewUpdates: 0 });
        continue;
      }
      let newReleases = 0;
      let publishedUpdates = 0;
      let reviewUpdates = 0;
      for (const release of parsed) {
        const existingIndex = bundle.releases.findIndex((item) => item.sourceSlug === slug && item.externalId === release.externalId);
        if (!options.force && existingIndex >= 0 && bundle.releases[existingIndex].contentHash === release.contentHash) {
          const sourceTopics = release.sourceTopics ?? [];
          const existingTopics = bundle.releases[existingIndex].sourceTopics;
          if (sourceTopics.join(",") !== existingTopics.join(",")) {
            bundle.releases[existingIndex].sourceTopics = sourceTopics;
            bundle.updates = bundle.updates.map((item) => item.releaseId === bundle.releases[existingIndex].id ? { ...item, sourceTopics } : item);
            bundle.review = bundle.review.map((item) => item.releaseId === bundle.releases[existingIndex].id ? { ...item, sourceTopics } : item);
          }
          continue;
        }
        const stored = toStoredRelease(slug, release, fetched.fetchedAt.toISOString());
        if (existingIndex >= 0) {
          bundle.releases[existingIndex] = stored;
          bundle.updates = bundle.updates.filter((item) => item.releaseId !== stored.id);
          bundle.review = bundle.review.filter((item) => item.releaseId !== stored.id);
        } else {
          bundle.releases.push(stored);
          newReleases += 1;
        }
        const analyzed = await analyze(release, source.tool, Boolean(options.noAi));
        analyzed.items.forEach((item, index) => {
          const update = toContentUpdate(stored, slug, item, index, analyzed.generatedBy);
          if (risky(item)) {
            const pending: ReviewUpdate = { ...update, reviewReason: "安全、计费、弃用、破坏性变化或 must_handle 更新需要人工确认后再移入 updates.json。" };
            bundle.review.push(pending);
            reviewUpdates += 1;
          } else {
            bundle.updates.push(update);
            publishedUpdates += 1;
          }
        });
      }
      state.status = "healthy";
      state.lastSuccessAt = fetched.fetchedAt.toISOString();
      state.consecutiveErrors = 0;
      state.etag = fetched.etag;
      state.lastContentHash = sourceContentHash;
      state.lastError = null;
      results.push({ sourceSlug: slug, status: newReleases || publishedUpdates || reviewUpdates ? "imported" : "unchanged", fetchedReleases: parsed.length, newReleases, publishedUpdates, reviewUpdates });
    } catch (error) {
      state.status = "degraded";
      state.consecutiveErrors += 1;
      state.lastError = error instanceof Error ? error.message : "unknown_error";
      results.push({ sourceSlug: slug, status: "failed", fetchedReleases: 0, newReleases: 0, publishedUpdates: 0, reviewUpdates: 0, error: state.lastError });
    }
  }
  bundle.releases.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  bundle.updates.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  bundle.review.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  bundle.sources.sort((a, b) => UPDATE_SOURCES.findIndex((source) => source.slug === a.slug) - UPDATE_SOURCES.findIndex((source) => source.slug === b.slug));
  if (!options.dryRun) await saveContent(bundle, options.contentRoot);
  return results;
}
