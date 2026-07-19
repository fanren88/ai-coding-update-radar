import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseClaudeCode, parseCodex, parseCopilotFeed, parseCursor, parseGeminiCli, parseWorkBuddy } from "./adapters";
import type { SourceFetchResult } from "./types";

const fetchedAt = new Date("2026-07-17T00:00:00.000Z");
const result = (body: string, contentType = "text/html"): SourceFetchResult => ({ body, status: 200, etag: null, url: "https://official.example", contentType, fetchedAt });
const fixture = (name: string) => readFileSync(join(process.cwd(), "tests", "fixtures", "codex", name), "utf8");

describe("official update adapters", () => {
  it("parses current Codex month and ignores navigation headings", () => {
    const rows = parseCodex(result(fixture("2026-07.html")));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ title: "ChatGPT for iOS 1.2026.188", version: "1.2026.188", channel: "stable", sourceTopics: ["codex-mobile"] });
    expect(rows[0].sourceUrl).toContain("codex-2026-07-13-mobile");
    expect(rows[0].body).toContain("## New features");
    expect(rows[0].body).toContain("Added support for inline visualizations in Codex tasks.");
  });

  it("keeps Codex GA entries without a numeric version", () => {
    const rows = parseCodex(result(fixture("2026-06.html")));
    expect(rows[0]).toMatchObject({ title: "Codex Remote reaches general availability", channel: "ga", sourceTopics: ["general", "codex-app", "codex-mobile"] });
  });

  it("parses Claude Code markdown using collection time when upstream has no date", () => {
    const rows = parseClaudeCode(result("# Changelog\n\n## 2.1.212\n\n- Added `/fork` background sessions\n\n## 2.1.211\n\n- Fixed permission previews", "text/plain"));
    expect(rows).toHaveLength(2);
    expect(rows[0].publishedAt).toEqual(fetchedAt);
  });

  it("parses Cursor article cards", () => {
    const html = `<main><article><time dateTime="2026-07-10T00:00:00.000Z">Jul 10</time><span class="label">3.11</span><header><h1><a href="/changelog/side-chat">Side Chats</a></h1></header><div class="prose"><p>Open a side chat without interrupting the main agent.</p></div></article></main>`;
    expect(parseCursor(result(html))[0]).toMatchObject({ version: "3.11", sourceUrl: "https://cursor.com/changelog/side-chat" });
  });

  it("filters GitHub RSS to Copilot updates", () => {
    const xml = `<rss><channel><item><title>Copilot model picker</title><link>https://github.blog/changelog/copilot</link><pubDate>Thu, 16 Jul 2026 00:00:00 +0000</pubDate><description><![CDATA[<p>New Copilot controls.</p>]]></description></item><item><title>Actions runner</title><link>https://github.blog/actions</link><pubDate>Thu, 16 Jul 2026 00:00:00 +0000</pubDate><description>Runner update</description></item></channel></rss>`;
    expect(parseCopilotFeed(result(xml, "application/rss+xml"))).toHaveLength(1);
  });

  it("parses Gemini CLI GitHub releases and preserves preview channel", () => {
    const body = JSON.stringify([{ id: 355, tag_name: "v0.52.0-preview.0", name: "Release v0.52.0-preview.0", prerelease: true, published_at: "2026-07-16T17:04:45Z", html_url: "https://github.com/google-gemini/gemini-cli/releases/tag/v0.52.0-preview.0", body: "Improved shell output." }]);
    expect(parseGeminiCli(result(body, "application/json"))[0]).toMatchObject({ externalId: "355", channel: "preview" });
  });

  it("parses the official Gemini CLI releases Atom fallback", () => {
    const atom = `<feed><entry><id>tag:github.com,2008:Repository/1/v0.52.0-preview.0</id><title>Release v0.52.0-preview.0</title><updated>2026-07-16T17:04:45Z</updated><published>2026-07-16T17:04:45Z</published><link rel="alternate" href="https://github.com/google-gemini/gemini-cli/releases/tag/v0.52.0-preview.0"/><content type="html">&lt;p&gt;Improved shell output.&lt;/p&gt;</content></entry></feed>`;
    expect(parseGeminiCli(result(atom, "application/atom+xml"))[0]).toMatchObject({ version: "v0.52.0-preview.0", channel: "preview" });
  });

  it("parses complete WorkBuddy release sections from the official VitePress page", () => {
    const rows = parseWorkBuddy(result(readFileSync(join(process.cwd(), "tests", "fixtures", "workbuddy", "changelog.html"), "utf8")));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ externalId: "2026-07-12:5.2.6", version: "5.2.6", channel: "stable", title: "WorkBuddy 5.2.6" });
    expect(rows[0].publishedAt).toEqual(new Date("2026-07-12T00:00:00.000Z"));
    expect(decodeURIComponent(rows[0].sourceUrl)).toContain("#_5-2-6-版本发布");
    expect(rows[0].body).toContain("权益变更更透明");
    expect(rows[0].body).toContain("## 体验优化");
    expect(rows[0].body).toContain("- 修复浏览器预览输入链接后卡回首页的问题");
  });
});
