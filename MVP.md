# AI 编程工具更新雷达 MVP

> 文档状态：MVP v0.2  
> 更新时间：2026-07-17  
> 暂定名称：DevPatch / AI 编程更新雷达

## 产品定义

聚合 AI 编程工具的官方更新，把冗长发布日志整理成“改了什么、影响谁、要不要行动、怎么尝试”的中文更新卡片。

只覆盖官方已发布信息，不做传闻、路线图猜测、第三方评测或泛 AI 新闻。

## 首批来源

| 工具 | 主来源 | 采集方式 |
|---|---|---|
| Codex | `developers.openai.com/codex/changelog` | 专用 HTML 解析器 |
| Claude Code | 官方 Raw `CHANGELOG.md` | Markdown 解析器 |
| Cursor | `cursor.com/changelog` | 专用 HTML 解析器 |
| GitHub Copilot | GitHub Changelog RSS | RSS + Copilot 过滤 |
| Gemini CLI | 官方 GitHub Releases | GitHub REST JSON |

每个 URL 固定在代码配置中，采集器只允许预设 HTTPS 域名，不能接收任意 URL。

## 用户闭环

1. 首页查看最近更新。
2. 按工具、类别、范围和重要程度筛选。
3. 用“我的工具”保留本地偏好。
4. 打开详情阅读变化、影响、行动和官方证据。
5. 在工具页回看历史，在周报页快速浏览本周重点。

网站不登录，不收集用户数据。“我的工具”只保存在 `localStorage`。

## 静态数据流水线

```text
GitHub Actions 定时运行
  → 读取五个固定官方来源
  → 专用适配器解析 release
  → externalId + contentHash 精确去重
  → AI 最多拆成五条用户可感知更新
  → Zod、证据和命令校验
  → 普通更新写入 content/updates.json
  → 高风险更新写入 content/review.json
  → Git 提交保存版本历史
  → Vercel Deploy Hook 触发静态构建
```

数据库不是 MVP 依赖。需要持久化的 release、更新、审核队列、来源状态和周报全部是小规模文本数据，由 Git 跟踪的 JSON 文件保存。

## 内容文件

- `releases.json`：官方标题、正文、版本、时间、URL、外部 ID 和 SHA-256。
- `updates.json`：公开更新卡片。
- `review.json`：等待人工确认的高风险条目。
- `sources.json`：ETag、解析内容哈希、最近成功时间、连续错误和错误信息。
- `weekly.json`：确定版本的周报及引用更新 ID。

Git 提供审核 Diff、作者、时间、回滚和历史版本。

## AI 边界

AI 可以翻译、拆分、分类和解释，只能使用提供的官方正文。

以下规则必须由代码验证：

- `evidenceExcerpt` 必须是官方正文的连续子串。
- `trySteps` 最多三项。
- 命令如果无法在官方正文中找到，必须删除。
- 一篇 release 最多五条更新。
- 安全、计费、弃用、破坏性或 `must_handle` 条目进入 `review.json`。
- AI 不可用时仍保存官方 release，并生成明确标记为 fallback 的保守卡片。
- 官方正文被视为不可信输入，不能覆盖系统指令。

## 页面

- `/`：更新流、四类筛选和“我的工具”。
- `/updates/[id]`：三段式解释、版本、时间和官方证据。
- `/tools/[slug]`：工具官方入口及已发布更新历史。
- `/weekly/[year]/[week]`：必须处理、值得尝试、了解即可。
- `/status`：上一次已保存的来源健康状态。

所有动态路径通过 `generateStaticParams()` 在构建时生成。`next.config.ts` 使用 `output: "export"`，最终产物位于 `out/`。

## 失败处理

- 网络失败：保留旧内容，来源状态改为 degraded。
- HTTP 304：不新增文件，不触发 AI。
- 页面结构失效：解析结果为空即失败，禁止用空数据覆盖历史。
- AI 或 schema 失败：保留官方 release，使用 fallback，不编造结论。
- 重复运行：相同 `sourceSlug + externalId + contentHash` 不产生重复内容。
- 页面导航或样式变化：聚合 release 哈希不变时不提交内容。

## 调度和部署

- 每两小时第 37 分钟采集全部来源。
- 每周一 01:23 UTC 生成周报。
- GitHub Actions 顺序处理来源，避免并发写 JSON。
- 内容变更后提交 Git，并调用 Vercel Deploy Hook。
- AI Gateway 在 CI 中使用 `AI_GATEWAY_API_KEY`，模型通过变量配置。

## 验收条件

- Codex 官方线上来源可以 dry-run 解析至少五条 release。
- 五个适配器有格式夹具和解析测试。
- 无数据库、无环境变量时可以本地查看已保存内容并完成静态构建。
- `out/` 包含首页、状态页、工具页、更新详情和周报 HTML。
- 重复采集不会重复写入 release 或 update。
- 空响应、错误内容类型、非白名单域名和解析结果为空都会失败。
- 每条公开更新都有官方 URL 和可核验 evidence。
- lint、typecheck、Vitest、静态 build 和 Playwright 全部通过。
