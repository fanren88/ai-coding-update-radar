"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { MessageResponse } from "@/components/ai-elements/message";
import type { ContentUpdate } from "@/lib/content-schema";

const tools = [
  { slug: "codex", name: "Codex", descriptionEn: "Latest updates to Codex, OpenAI’s coding agent.", descriptionZh: "Codex 的最新官方更新，OpenAI 的编程智能体。" },
  { slug: "claude-code", name: "Claude Code", descriptionEn: "Latest updates to Claude Code, Anthropic’s coding agent.", descriptionZh: "Claude Code 的最新官方更新，Anthropic 的编程智能体。" },
  { slug: "cursor", name: "Cursor", descriptionEn: "Latest updates to Cursor, the AI code editor.", descriptionZh: "Cursor 的最新官方更新，面向开发者的 AI 代码编辑器。" },
  { slug: "gemini-cli", name: "Gemini CLI", descriptionEn: "Latest updates to Google’s open-source coding agent.", descriptionZh: "Gemini CLI 的最新官方更新，Google 的开源编程智能体。" },
  { slug: "workbuddy", name: "WorkBuddy", descriptionEn: "Latest updates to WorkBuddy, Tencent Cloud CodeBuddy’s AI work assistant.", descriptionZh: "WorkBuddy 的最新官方更新，腾讯云 CodeBuddy 的 AI 工作助理。" },
] as const;

const codexTopics = [
  { slug: "all", labelEn: "All updates", labelZh: "全部更新" },
  { slug: "general", labelEn: "General", labelZh: "通用" },
  { slug: "codex-app", labelEn: "ChatGPT desktop app", labelZh: "ChatGPT 桌面应用" },
  { slug: "codex-mobile", labelEn: "Remote", labelZh: "远程" },
  { slug: "codex-cli", labelEn: "Codex CLI", labelZh: "Codex CLI" },
] as const;

const copy = {
  en: { brand: "Update archive", tools: "Tools", archive: "Archive", changelog: "changelog", empty: "No official updates have been collected for this category yet.", topicsLabel: "Codex update categories", languageLabel: "Language", untranslated: "English translation pending — showing the official Chinese text.", quickNav: "Quick navigation", unversioned: "Unversioned", jumpTo: "Jump to version" },
  zh: { brand: "更新档案", tools: "工具", archive: "归档", changelog: "更新日志", empty: "这一分类暂时没有收录到官方更新。", topicsLabel: "Codex 更新分类", languageLabel: "语言", untranslated: "中文译文尚未生成，当前显示官方英文原文。", quickNav: "快速导航", unversioned: "未标版本", jumpTo: "跳转到版本" },
} as const;

type ToolSlug = typeof tools[number]["slug"];
type CodexTopic = typeof codexTopics[number]["slug"];
type Language = keyof typeof copy;
type ArchiveUpdate = ContentUpdate & {
  sourceLanguage: Language;
  fullContentEn: string;
  fullContentZh: string | null;
  hasContentEn: boolean;
  hasContentZh: boolean;
};

const languageEvent = "devpatch-language-change";
const subscribeLanguage = (onChange: () => void) => {
  window.addEventListener(languageEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(languageEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
};
const languageSnapshot = (): Language => {
  const stored = window.localStorage.getItem("devpatch-language");
  if (stored === "en" || stored === "zh") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
};
const serverLanguageSnapshot = (): Language => "zh";

const legacyCodexTopic = (item: ContentUpdate) => {
  const text = `${item.title} ${item.version ?? ""}`;
  if (/codex cli/i.test(text)) return "codex-cli";
  if (/chatgpt for (?:ios|android)|remote/i.test(text)) return "codex-mobile";
  if (/codex app|desktop app/i.test(text)) return "codex-app";
  return "general";
};

const topicFor = (item: ContentUpdate) => item.sourceTopics[0] ?? legacyCodexTopic(item);
const monthKey = (value: string) => value.slice(0, 7);
const monthLabel = (value: string, language: Language) => {
  const [year, rawMonth] = value.split("-");
  if (language === "zh") return `${year}年${Number(rawMonth)}月`;
  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(`${year}-${rawMonth}-01T00:00:00Z`));
  return `${month} ${year}`;
};
const archiveLabel = (value: string, language: Language) => {
  const [year, month] = value.split("-");
  return language === "zh" ? `${year}年${Number(month)}月` : monthLabel(value, "en");
};
const dateLabel = (value: string) => value.slice(0, 10).replaceAll("-", ".");
const updateAnchor = (item: ArchiveUpdate) => `update-${item.id}`;

function VersionNavigation({ className, items, language }: { className: string; items: ArchiveUpdate[]; language: Language }) {
  return (
    <nav className={className} aria-label={copy[language].quickNav}>
      <p className="update-version-nav-heading">{copy[language].quickNav}</p>
      <div className="update-version-list">
        {items.map((item) => {
          const version = item.version ?? copy[language].unversioned;
          return (
            <a key={item.id} href={`#${updateAnchor(item)}`} className="update-version-link" aria-label={`${copy[language].jumpTo} ${version} (${dateLabel(item.publishedAt)})`}>
              <span>{version}</span>
              <time dateTime={item.publishedAt}>{dateLabel(item.publishedAt)}</time>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function CodexArchive({ items }: { items: ArchiveUpdate[] }) {
  const [selectedTool, setSelectedTool] = useState<ToolSlug>("codex");
  const [selectedTopic, setSelectedTopic] = useState<CodexTopic>("all");
  const language = useSyncExternalStore(subscribeLanguage, languageSnapshot, serverLanguageSnapshot);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const tool = tools.find((item) => item.slug === selectedTool) ?? tools[0];
  const selectedItems = useMemo(() => items
    .filter((item) => item.toolSlug === selectedTool)
    .filter((item) => selectedTool !== "codex" || selectedTopic === "all" || topicFor(item) === selectedTopic)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [items, selectedTool, selectedTopic]);

  const grouped = useMemo(() => {
    const months = new Map<string, ArchiveUpdate[]>();
    for (const item of selectedItems) {
      const month = monthKey(item.publishedAt);
      months.set(month, [...(months.get(month) ?? []), item]);
    }
    return [...months.entries()];
  }, [selectedItems]);

  const archive = useMemo(() => {
    const months = new Map<string, number>();
    for (const item of selectedItems) {
      const month = monthKey(item.publishedAt);
      months.set(month, (months.get(month) ?? 0) + 1);
    }
    return [...months.entries()];
  }, [selectedItems]);

  const selectTool = (slug: ToolSlug) => {
    setSelectedTool(slug);
    setSelectedTopic("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectTopic = (topic: CodexTopic) => setSelectedTopic(topic);

  const selectLanguage = (nextLanguage: Language) => {
    window.localStorage.setItem("devpatch-language", nextLanguage);
    window.dispatchEvent(new Event(languageEvent));
  };

  return (
    <div className="update-explorer" lang={language === "zh" ? "zh-CN" : "en"}>
      <aside className="update-sidebar">
        <Link href="/" className="update-brand" aria-label={language === "zh" ? "DevPatch 首页" : "DevPatch home"}>
          <span className="update-brand-mark">D</span>
          <span><strong>DevPatch</strong><small>{copy[language].brand}</small></span>
        </Link>

        <div className="update-sidebar-rule"/>

        <nav aria-label={language === "zh" ? "工具目录" : "Tool directory"}>
          <p className="update-sidebar-label">{copy[language].tools}</p>
          <div className="update-tool-list">
            {tools.map((item) => {
              const count = items.filter((update) => update.toolSlug === item.slug).length;
              const active = item.slug === selectedTool;
              return (
                <button key={item.slug} type="button" className="update-tool-button" data-active={active || undefined} aria-pressed={active} onClick={() => selectTool(item.slug)}>
                  <span>{item.name}</span><span>{String(count).padStart(2, "0")}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="update-sidebar-rule"/>

        <nav className="update-archive" aria-label={language === "zh" ? "月份归档" : "Monthly archive"}>
          <p className="update-sidebar-label">{copy[language].archive}</p>
          <div className="update-archive-list">
            {archive.map(([month, count]) => (
              <a key={month} href={`#month-${month}`}>
                <span>{archiveLabel(month, language)}</span><span>{String(count).padStart(2, "0")}</span>
              </a>
            ))}
          </div>
        </nav>
      </aside>

      <main className="update-main">
        <header className="update-heading reveal">
          <div className="update-language-switch" role="group" aria-label={copy[language].languageLabel}>
            <button type="button" data-active={language === "zh" || undefined} aria-pressed={language === "zh"} onClick={() => selectLanguage("zh")}>中文</button>
            <span aria-hidden="true">/</span>
            <button type="button" data-active={language === "en" || undefined} aria-pressed={language === "en"} onClick={() => selectLanguage("en")}>EN</button>
          </div>
          <h1 className="font-editorial">{tool.name} {copy[language].changelog}</h1>
          <p>{language === "zh" ? tool.descriptionZh : tool.descriptionEn}</p>

          {selectedTool === "codex" ? (
            <nav className="update-topic-tabs" aria-label={copy[language].topicsLabel}>
              {codexTopics.map((topic) => (
                <button key={topic.slug} type="button" data-active={selectedTopic === topic.slug || undefined} aria-pressed={selectedTopic === topic.slug} onClick={() => selectTopic(topic.slug)}>
                  {language === "zh" ? topic.labelZh : topic.labelEn}
                </button>
              ))}
            </nav>
          ) : null}
        </header>

        {selectedItems.length ? <VersionNavigation className="update-version-strip" items={selectedItems} language={language}/> : null}

        <div className="update-months" aria-live="polite">
          {grouped.length ? grouped.map(([month, monthItems]) => (
            <section key={month} id={`month-${month}`} className="update-month-section">
              <h2 className="font-editorial">{monthLabel(month, language)}</h2>
              <div className="update-month-rows">
                {monthItems.map((item) => (
                  <article key={item.id} id={updateAnchor(item)} className="update-log-row">
                    <header className="update-log-meta">
                      <time dateTime={item.publishedAt}>{dateLabel(item.publishedAt)}</time>
                      <p className="font-editorial">{item.version ?? copy[language].unversioned}</p>
                    </header>
                    <div className="update-log-content">
                      {(language === "zh" && !item.hasContentZh) || (language === "en" && !item.hasContentEn)
                        ? <p className="update-translation-pending">{copy[language].untranslated}</p>
                        : null}
                      <MessageResponse className="update-log-evidence">{language === "zh" ? item.fullContentZh ?? item.fullContentEn : item.fullContentEn}</MessageResponse>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )) : (
            <div className="update-empty">{copy[language].empty}</div>
          )}
        </div>

      </main>

      {selectedItems.length ? (
        <aside className="update-version-rail">
          <VersionNavigation className="update-version-nav" items={selectedItems} language={language}/>
        </aside>
      ) : null}
    </div>
  );
}
