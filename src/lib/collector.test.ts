import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectOfficialUpdates } from "./collector";
import { loadContent, saveContent } from "./content-store";

const roots: string[] = [];
afterEach(async () => { vi.unstubAllGlobals(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function emptyRoot() {
  const root = await mkdtemp(join(tmpdir(), "devpatch-collector-"));
  roots.push(root);
  await saveContent({ releases: [], updates: [], review: [], sources: [], weekly: [] }, root);
  return root;
}

function officialResponse(body: string) {
  const response = new Response(body, { status: 200, headers: { "content-type": "text/html", etag: '"codex-fixture"' } });
  Object.defineProperty(response, "url", { value: "https://developers.openai.com/codex/changelog" });
  return response;
}

describe("file-backed collector", () => {
  it("is idempotent for the same official releases", async () => {
    const root = await emptyRoot();
    const body = await readFile(join(process.cwd(), "tests/fixtures/codex/2026-07.html"), "utf8");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(officialResponse(body))));

    const first = await collectOfficialUpdates({ sources: ["codex"], noAi: true, contentRoot: root });
    const second = await collectOfficialUpdates({ sources: ["codex"], noAi: true, contentRoot: root });
    const content = await loadContent(root);

    expect(first[0]).toMatchObject({ status: "imported", newReleases: 2 });
    expect(second[0]).toMatchObject({ status: "unchanged", newReleases: 0 });
    expect(content.releases).toHaveLength(2);
    expect(content.updates).toHaveLength(2);
  });

  it("marks parser failures degraded without deleting old content", async () => {
    const root = await emptyRoot();
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(officialResponse("<html><body>No releases</body></html>"))));
    const result = await collectOfficialUpdates({ sources: ["codex"], noAi: true, contentRoot: root });
    const content = await loadContent(root);
    expect(result[0]).toMatchObject({ status: "failed", error: "parser_returned_no_releases" });
    expect(content.releases).toEqual([]);
    expect(content.sources[0]).toMatchObject({ status: "degraded", consecutiveErrors: 1 });
  });
});
