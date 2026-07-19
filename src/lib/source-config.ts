export const UPDATE_SOURCES = [
  { slug: "codex", tool: "Codex", vendor: "OpenAI", type: "html", url: "https://learn.chatgpt.com/docs/changelog", officialUrl: "https://learn.chatgpt.com/docs/changelog", description: "OpenAI 的编程代理" },
  { slug: "claude-code", tool: "Claude Code", vendor: "Anthropic", type: "markdown", url: "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md", officialUrl: "https://github.com/anthropics/claude-code", description: "Anthropic 的终端编程代理" },
  { slug: "cursor", tool: "Cursor", vendor: "Anysphere", type: "html", url: "https://www.cursor.com/changelog", officialUrl: "https://www.cursor.com", description: "AI 原生代码编辑器" },
  { slug: "github-copilot", tool: "GitHub Copilot", vendor: "GitHub", type: "rss", url: "https://github.blog/changelog/feed/", officialUrl: "https://github.com/features/copilot", description: "GitHub 的 AI 编程助手" },
  { slug: "gemini-cli", tool: "Gemini CLI", vendor: "Google", type: "github", url: "https://api.github.com/repos/google-gemini/gemini-cli/releases", officialUrl: "https://github.com/google-gemini/gemini-cli", description: "Google 的开源终端 AI 代理" },
] as const;
export type UpdateSourceSlug = (typeof UPDATE_SOURCES)[number]["slug"]; export const getUpdateSource = (slug: string) => UPDATE_SOURCES.find((x) => x.slug === slug);
