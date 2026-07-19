import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { getUpdateSource, type UpdateSourceSlug } from "./source-config";
import type { OfficialRelease, SourceFetchResult, UpdateSourceAdapter } from "./types";

const BODY_LIMIT = 2 * 1024 * 1024;
const ALLOWED_HOSTS = new Set([
  "developers.openai.com",
  "learn.chatgpt.com",
  "raw.githubusercontent.com",
  "www.cursor.com",
  "cursor.com",
  "github.blog",
  "api.github.com",
  "github.com",
  "www.codebuddy.cn",
]);

export const hashContent = (value: string) => createHash("sha256").update(value).digest("hex");
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const releaseHash = (title: string, body: string) => hashContent(`${title}\n${body}`);
const versionOf = (value: string) => value.match(/v?\d+(?:\.\d+){1,3}(?:[-.]?(?:preview|beta|rc)[-.]?\d*)?/i)?.[0] ?? null;
const channelOf = (value: string): OfficialRelease["channel"] => {
  if (/nightly/i.test(value)) return "nightly";
  if (/(preview|beta|\brc\b)/i.test(value)) return "preview";
  if (/(general availability|\bga\b)/i.test(value)) return "ga";
  return versionOf(value) ? "stable" : "unknown";
};

function codexArticleToMarkdown(html: string) {
  const $ = cheerio.load(html);
  const root = $("body");

  root.find("script, style, button, summary").remove();
  root.find("pre").each((_, node) => {
    const value = $(node).text().trim();
    $(node).replaceWith(value ? `\n\n\`\`\`bash\n${value}\n\`\`\`\n\n` : "");
  });
  root.find("h1, h2, h3, h4, h5, h6").each((_, node) => {
    const value = clean($(node).text());
    $(node).replaceWith(value ? `\n\n## ${value}\n\n` : "");
  });
  root.find("li").each((_, node) => {
    const value = clean($(node).text());
    $(node).replaceWith(value ? `\n- ${value}\n` : "");
  });
  root.find("p").each((_, node) => {
    const value = clean($(node).text());
    $(node).replaceWith(value ? `\n\n${value}\n\n` : "");
  });
  root.find("br").replaceWith("\n");

  return root.text()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 30_000);
}

async function readLimited(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > BODY_LIMIT) throw new Error("body_too_large");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > BODY_LIMIT) {
      await reader.cancel();
      throw new Error("body_too_large");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

function assertAllowedUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) throw new Error("host_not_allowed");
}

function assertContentType(type: string, sourceType: string) {
  const accepted = sourceType === "github"
    ? /(?:application\/(?:json|vnd\.github\+json)|(?:atom|xml))/i
    : sourceType === "markdown"
      ? /(?:text\/plain|text\/markdown|application\/octet-stream)/i
      : sourceType === "rss"
        ? /(?:xml|rss)/i
        : /text\/html/i;
  if (!accepted.test(type)) throw new Error("unsupported_content_type");
}

export function parseCodex(result: SourceFetchResult): OfficialRelease[] {
  const $ = cheerio.load(result.body);
  return $("section[data-changelog-month-section] > ul > li").toArray().slice(0, 30).flatMap((node) => {
    const element = $(node);
    const date = clean(element.find("time").first().text());
    const title = clean(element.find("h3").first().text());
    const body = codexArticleToMarkdown(element.find("article").first().html() ?? "");
    const sourceTopics = (element.attr("data-codex-topics") ?? "general")
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean);
    const anchor = element.attr("id") ?? `month-${date.slice(0, 7)}`;
    if (!date || !title || !body || Number.isNaN(Date.parse(date))) return [];
    return [{
      externalId: `${date}:${title}`,
      version: versionOf(title),
      channel: channelOf(title),
      publishedAt: new Date(`${date}T00:00:00.000Z`),
      sourceUrl: `https://learn.chatgpt.com/docs/changelog#${anchor}`,
      title,
      body,
      contentHash: releaseHash(title, body),
      sourceTopics,
    }];
  });
}

export function parseClaudeCode(result: SourceFetchResult): OfficialRelease[] {
  return result.body.split(/^##\s+/m).slice(1, 31).flatMap((section) => {
    const [heading = "", ...rest] = section.split("\n");
    const title = clean(heading);
    const body = rest.join("\n").trim().slice(0, 30_000);
    if (!title || !body) return [];
    return [{
      externalId: title,
      version: versionOf(title),
      channel: channelOf(title),
      publishedAt: result.fetchedAt,
      sourceUrl: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md",
      title,
      body,
      contentHash: releaseHash(title, body),
    }];
  });
}

export function parseCursor(result: SourceFetchResult): OfficialRelease[] {
  const $ = cheerio.load(result.body);
  return $("main article").toArray().slice(0, 30).flatMap((node) => {
    const element = $(node);
    const title = clean(element.find("header h1").first().text());
    const body = clean(element.find(".prose").first().text()).slice(0, 30_000);
    const dateText = element.find("time").first().attr("datetime") ?? clean(element.find("time").first().text());
    const version = clean(element.find(".label").first().text()) || versionOf(title);
    const href = element.find("header h1 a").first().attr("href") ?? "/changelog";
    if (!title || !body || !dateText || Number.isNaN(Date.parse(dateText))) return [];
    return [{
      externalId: href,
      version: version || null,
      channel: channelOf(`${version} ${title}`),
      publishedAt: new Date(dateText),
      sourceUrl: new URL(href, "https://cursor.com").toString(),
      title,
      body,
      contentHash: releaseHash(title, body),
    }];
  });
}

export function parseCopilotFeed(result: SourceFetchResult): OfficialRelease[] {
  const $ = cheerio.load(result.body, { xmlMode: true });
  return $("item").toArray().slice(0, 100).flatMap((node) => {
    const element = $(node);
    const title = clean(element.find("title").first().text());
    const rawDescription = element.find("description").first().text();
    const body = clean(cheerio.load(rawDescription).text()).slice(0, 30_000);
    const link = clean(element.find("link").first().text());
    const dateText = clean(element.find("pubDate").first().text());
    if (!/copilot/i.test(`${title} ${body}`) || !title || !body || !link || Number.isNaN(Date.parse(dateText))) return [];
    return [{
      externalId: link,
      version: versionOf(title),
      channel: channelOf(`${title} ${body}`),
      publishedAt: new Date(dateText),
      sourceUrl: link,
      title,
      body,
      contentHash: releaseHash(title, body),
    }];
  });
}

export function parseGeminiCli(result: SourceFetchResult): OfficialRelease[] {
  if (result.body.trimStart().startsWith("<")) {
    const $ = cheerio.load(result.body, { xmlMode: true });
    return $("entry").toArray().slice(0, 30).flatMap((node) => {
      const element = $(node);
      const title = clean(element.find("title").first().text());
      const sourceUrl = element.find("link[rel='alternate']").attr("href") ?? element.find("link").first().attr("href") ?? "";
      const rawContent = element.find("content").first().text();
      const body = clean(cheerio.load(rawContent).text()).slice(0, 30_000);
      const publishedAt = new Date(clean(element.find("published").first().text()) || clean(element.find("updated").first().text()));
      if (!title || !body || !sourceUrl || Number.isNaN(publishedAt.getTime())) return [];
      return [{ externalId: clean(element.find("id").first().text()) || sourceUrl, version: versionOf(title), channel: channelOf(title), publishedAt, sourceUrl, title, body, contentHash: releaseHash(title, body) }];
    });
  }
  const rows = JSON.parse(result.body) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows)) throw new Error("invalid_github_payload");
  return rows.slice(0, 30).flatMap((row) => {
    const title = clean(String(row.name || row.tag_name || ""));
    const body = String(row.body || "").trim().slice(0, 30_000);
    const publishedAt = new Date(String(row.published_at || row.created_at || ""));
    const sourceUrl = String(row.html_url || "");
    if (!title || !body || !sourceUrl || Number.isNaN(publishedAt.getTime())) return [];
    return [{
      externalId: String(row.id),
      version: String(row.tag_name || "") || null,
      channel: Boolean(row.prerelease) ? "preview" : channelOf(title),
      publishedAt,
      sourceUrl,
      title,
      body,
      contentHash: releaseHash(title, body),
    }];
  });
}

export function parseWorkBuddy(result: SourceFetchResult): OfficialRelease[] {
  const $ = cheerio.load(result.body);
  const releases = $("main .vp-doc h2").toArray().flatMap((node) => {
    const element = $(node);
    const heading = element.clone().find(".header-anchor").remove().end().text().trim();
    const version = heading.match(/^(\d+(?:\.\d+){1,3})/)?.[1];
    const date = heading.match(/[（(](\d{4}-\d{2}-\d{2})[）)]/)?.[1];
    if (!version || !date || Number.isNaN(Date.parse(date))) return [];

    const bodyHtml = element.nextUntil("h2").toArray().map((sibling) => $.html(sibling)).join("\n");
    const body = codexArticleToMarkdown(bodyHtml);
    if (!body) return [];

    const anchor = element.attr("id");
    const sourceUrl = new URL(anchor ? `#${anchor}` : "", "https://www.codebuddy.cn/docs/workbuddy/Changelog").toString();
    const title = `WorkBuddy ${version}`;
    return [{
      externalId: `${date}:${version}`,
      version,
      channel: "stable" as const,
      publishedAt: new Date(`${date}T00:00:00.000Z`),
      sourceUrl,
      title,
      body,
      contentHash: releaseHash(title, body),
    }];
  });

  return releases.slice(0, 30);
}

const parsers: Record<UpdateSourceSlug, (result: SourceFetchResult) => OfficialRelease[]> = {
  codex: parseCodex,
  "claude-code": parseClaudeCode,
  cursor: parseCursor,
  "github-copilot": parseCopilotFeed,
  "gemini-cli": parseGeminiCli,
  workbuddy: parseWorkBuddy,
};

export function createUpdateAdapter(slug: UpdateSourceSlug): UpdateSourceAdapter {
  const config = getUpdateSource(slug);
  if (!config) throw new Error("unknown_source");
  return {
    async fetch(etag) {
      assertAllowedUrl(config.url);
      const headers: Record<string, string> = {
        accept: config.type === "github" ? "application/vnd.github+json" : "text/html,application/rss+xml,text/plain",
        "user-agent": "DevPatchRadar/2.0 (+https://github.com)",
      };
      if (etag) headers["if-none-match"] = etag;
      if (config.url.startsWith("https://api.github.com") && process.env.GITHUB_SOURCE_TOKEN) {
        headers.authorization = `Bearer ${process.env.GITHUB_SOURCE_TOKEN}`;
      }
      let response = await fetch(config.url, { headers, signal: AbortSignal.timeout(20_000), redirect: "follow" });
      if (slug === "gemini-cli" && [403, 429].includes(response.status) && !process.env.GITHUB_SOURCE_TOKEN) {
        response = await fetch("https://github.com/google-gemini/gemini-cli/releases.atom", { headers: { accept: "application/atom+xml", "user-agent": headers["user-agent"] }, signal: AbortSignal.timeout(20_000), redirect: "follow" });
      }
      assertAllowedUrl(response.url);
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status === 304) return { body: "", status: 304, etag: etag ?? null, url: response.url, contentType, fetchedAt: new Date() };
      if (!response.ok) throw new Error(`http_${response.status}`);
      assertContentType(contentType, config.type);
      const body = await readLimited(response);
      if (!body.trim()) throw new Error("empty_response");
      return { body, status: response.status, etag: response.headers.get("etag"), url: response.url, contentType, fetchedAt: new Date() };
    },
    parse: parsers[slug],
  };
}
