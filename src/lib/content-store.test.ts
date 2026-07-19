import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { loadContent, saveContent, stableId } from "./content-store";
import { UPDATE_SOURCES } from "./source-config";

const temporaryRoots: string[] = [];
afterEach(async () => Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("static content store", () => {
  it("validates the repository content bundle", async () => {
    const content = await loadContent();
    const codex = content.updates.filter((item) => item.toolSlug === "codex");
    expect(codex.length).toBeGreaterThanOrEqual(30);
    expect(new Set(codex.map((item) => item.id)).size).toBe(codex.length);
    expect(codex.some((item) => item.sourceTopics.includes("codex-cli"))).toBe(true);
    expect(codex.every((item) => item.sourceUrl.includes("learn.chatgpt.com/docs/changelog"))).toBe(true);
    expect(content.sources.map((item) => item.slug)).toEqual(UPDATE_SOURCES.map((item) => item.slug));
    expect(content.releases.some((item) => item.sourceSlug === "workbuddy" && item.sourceLanguage === "zh")).toBe(true);
  });

  it("writes and reloads content atomically", async () => {
    const root = await mkdtemp(join(tmpdir(), "devpatch-content-"));
    temporaryRoots.push(root);
    const content = await loadContent();
    await saveContent(content, root);
    await expect(loadContent(root)).resolves.toEqual(content);
  });

  it("creates deterministic path-safe identifiers", () => {
    expect(stableId("codex", "2026-07-13:Release")).toBe(stableId("codex", "2026-07-13:Release"));
    expect(stableId("codex", "2026-07-13:Release")).toMatch(/^codex-[a-f0-9]{16}$/);
  });
});
