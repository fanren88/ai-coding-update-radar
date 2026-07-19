import { describe, expect, it, vi } from "vitest";
import type { ContentRelease } from "./content-schema";
import { detectSourceLanguage, translateRelease, translationIsFresh } from "./translator";

const release: ContentRelease = {
  id: "codex-release",
  sourceSlug: "codex",
  externalId: "release-1",
  version: "1.2.3",
  channel: "stable",
  publishedAt: "2026-07-18T00:00:00.000Z",
  collectedAt: "2026-07-18T00:00:00.000Z",
  sourceUrl: "https://learn.chatgpt.com/docs/changelog",
  title: "Codex CLI 1.2.3",
  body: "## New features\n\n- Added `codex --fast`.\n\n```bash\nnpm install -g @openai/codex\n```",
  sourceLanguage: "en",
  contentHash: "a".repeat(64),
  sourceTopics: ["codex-cli"],
};

const response = (content: object) => new Response(JSON.stringify({
  model: "deepseek-v4-flash",
  choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }],
}), { status: 200, headers: { "content-type": "application/json" } });

describe("DeepSeek release translator", () => {
  it("returns validated Chinese Markdown and never persists the key", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      titleTranslated: "Codex CLI 1.2.3",
      bodyTranslated: "## 新功能\n\n- 新增 `codex --fast`。\n\n```bash\nnpm install -g @openai/codex\n```",
    }));

    const translated = await translateRelease(release, { apiKey: "temporary-key", fetchImpl });
    expect(translated).toMatchObject({ sourceLanguage: "en", targetLanguage: "zh", titleEn: release.title, titleZh: "Codex CLI 1.2.3", sourceHash: release.contentHash, model: "deepseek-v4-flash" });
    expect(JSON.stringify(translated)).not.toContain("temporary-key");
    expect(fetchImpl).toHaveBeenCalledWith("https://api.deepseek.com/chat/completions", expect.objectContaining({ method: "POST" }));
  });

  it("rejects translations that alter commands or Markdown structure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      titleTranslated: "Codex CLI 1.2.3",
      bodyTranslated: "## 新功能\n\n- 新增快速模式。",
    }));

    await expect(translateRelease(release, { apiKey: "temporary-key", fetchImpl })).rejects.toThrow("translation_code_block_mismatch");
  });

  it("detects Chinese prose while ignoring commands and translates it to English", async () => {
    const chineseRelease: ContentRelease = {
      ...release,
      id: "chinese-release",
      externalId: "release-zh-1",
      title: "Codex CLI 更新",
      body: "## 新功能\n\n- 新增 `codex --fast` 快速模式。",
      sourceLanguage: "zh",
      contentHash: "b".repeat(64),
    };
    const fetchImpl = vi.fn().mockResolvedValue(response({
      titleTranslated: "Codex CLI update",
      bodyTranslated: "## New features\n\n- Added the `codex --fast` fast mode.",
    }));

    expect(detectSourceLanguage(`${chineseRelease.title}\n${chineseRelease.body}`)).toBe("zh");
    expect(detectSourceLanguage(`${release.title}\n${release.body}`)).toBe("en");
    const translated = await translateRelease(chineseRelease, { apiKey: "temporary-key", fetchImpl });
    expect(translated).toMatchObject({ sourceLanguage: "zh", targetLanguage: "en", titleZh: chineseRelease.title, titleEn: "Codex CLI update" });
    expect(translationIsFresh({ ...chineseRelease, translation: translated })).toBe(true);
  });
});
