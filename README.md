# DevPatch · AI 编程工具更新雷达

追踪 Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI 和 WorkBuddy 的官方更新。项目没有数据库：GitHub Actions 采集完整官方日志并写入 `content/*.json`，Next.js 构建为完全静态的网站。

## 本地查看

```bash
npm install
npm run dev
```

访问 <http://localhost:3000>。页面读取仓库内已保存的真实官方数据，不需要环境变量。

验证静态产物：

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 3200
```

`npm run build` 会生成 `out/`，其中只有 HTML、CSS、JavaScript 和静态资源。

## 真实采集

无 AI Key 的只读检查：

```bash
npm run collect -- --source codex --dry-run --no-ai --max-releases 5
```

采集并写入 JSON：

```bash
npm run collect -- --source codex --no-ai
npm run collect -- --source all
```

首次扩大历史回填数量，或需要忽略已有 ETag 重新拉取：

```bash
npm run collect -- --source all --no-ai --force --max-releases 10
```

支持的参数：

- `--source codex`：单个来源，也可使用逗号分隔或 `all`。
- WorkBuddy 的来源 slug 是 `workbuddy`，官方中文日志会保留中文原文，并只生成英文译文。
- `--dry-run`：联网解析但不写文件。
- `--no-ai`：只保存官方内容并生成明确标记的 fallback 卡片。
- `--force`：忽略 ETag，强制重新获取官方正文。
- `--max-releases 5`：限制每个来源处理数量。

AI 分析需要 `AI_GATEWAY_API_KEY`。`GITHUB_SOURCE_TOKEN` 可选，用来提高 Gemini CLI GitHub API 限额。

## DeepSeek 中英文翻译

翻译在本地采集阶段完成，网站不会调用 DeepSeek，也不会把 API Key 打包到前端。采集器会识别官方正文主语言：英文来源生成中文译文，中文来源生成英文译文；原文和目标语言译文一起保存在 `content/releases.json`，语言切换只读取静态 JSON。

先用一条内容测试：

```bash
DEEPSEEK_API_KEY='你的临时 Key' npm run translate -- --source codex --limit 1
```

确认结果后翻译全部已采集内容：

```bash
DEEPSEEK_API_KEY='你的临时 Key' npm run translate -- --source all
```

如果不希望 Key 出现在 shell 历史里，可以在 zsh 中使用隐藏输入：

```bash
read -s "DEEPSEEK_API_KEY?DeepSeek API Key: "
export DEEPSEEK_API_KEY
npm run translate -- --source all
unset DEEPSEEK_API_KEY
```

可选参数：

- `--source codex`：只翻译一个来源，默认 `all`。
- `--limit 1`：限制本次翻译数量，适合先测试成本和效果。
- `--force`：即使原文哈希没有变化，也重新翻译。
- `--dry-run`：调用翻译但不写入 JSON。
- `DEEPSEEK_MODEL`：可临时覆盖模型，默认 `deepseek-v4-flash`。

翻译器会校验标题层级、列表数量、代码块和行内代码；结构被模型改动时拒绝写入，已完成的其他译文仍会保留。

## 内容目录

```text
content/
├── releases.json  # 官方 release 原文、中文译文和哈希
├── updates.json   # 已通过规则检查、公开展示的更新
├── review.json    # 安全、计费、弃用、破坏性或 must_handle 更新
├── sources.json   # 来源 ETag、内容哈希和健康状态
└── weekly.json    # 已生成的静态周报
```

批准高风险内容时，在 Git 分支中核对 `review.json` 的证据，将条目移入 `updates.json` 并删除 `reviewReason`，通过 PR 合并。Git 历史就是审核与回滚记录。

## GitHub Actions / Vercel

1. 将本目录推送为独立 GitHub 仓库并连接 Vercel。
2. 确认 Vercel 已连接该 GitHub 仓库；只有未启用 Git Integration 时才需要在 `Settings → Git → Deploy Hooks` 为 `main` 创建 Hook。
3. 配置 GitHub Actions Secrets：
   - `DEEPSEEK_API_KEY`：用于把新增或发生变化的官方日志翻译成中文。
   - `AI_GATEWAY_API_KEY`
   - `VERCEL_DEPLOY_HOOK`（可选；已经连接 Vercel Git Integration 时不需要）
   - `GITHUB_SOURCE_TOKEN`（可选）
4. 可选配置 GitHub Actions Variable：`DEEPSEEK_MODEL=deepseek-v4-flash`。
5. 在仓库 Actions 设置中允许工作流拥有 `Read and write permissions`。
6. 手动运行 `Collect official coding updates`，`source` 选择 `all`。首次运行会补齐尚未翻译的历史内容，以后只翻译新增或原文哈希发生变化的条目。

采集每两小时运行一次，顺序为“采集英文原文 → DeepSeek 翻译缺失内容 → 测试和静态构建 → 提交 `content/`”。如果部分翻译失败，已经成功的译文仍会先提交，随后工作流标记失败，方便下次自动重试。Vercel 连接 GitHub 后会根据这次内容提交自动部署；周报在每周一 01:23 UTC 生成。网站没有 Vercel Functions、Cookie、管理员系统或数据库连接。

详细产品边界见 [MVP.md](./MVP.md)，重构记录见 [静态流水线计划](./docs/plans/2026-07-17-static-content-pipeline.md)。
