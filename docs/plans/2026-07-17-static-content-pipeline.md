# Static Content Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Neon-backed runtime synchronization with a Git-tracked static content pipeline that collects official coding-tool updates in GitHub Actions and deploys a fully static site to Vercel.

**Architecture:** Source-specific adapters fetch only fixed official URLs. A Node collection script normalizes releases, deduplicates them against versioned JSON files, optionally asks Vercel AI Gateway for structured Chinese explanations, and writes validated content files. Next.js reads those files at build time and exports HTML for every public route; GitHub Actions commits changed content and calls a Vercel Deploy Hook.

**Tech Stack:** Next.js 16 static export, TypeScript, Cheerio, Zod, AI SDK, GitHub Actions, Vercel AI Gateway and Deploy Hooks.

---

### Task 1: File content model

**Files:**
- Create: `content/*.json`
- Create: `src/lib/content-schema.ts`
- Modify: `src/lib/types.ts`

Define and validate releases, published updates, review items, weekly digests and source health without a database.

**Verification:** `npm test -- src/lib/content-store.test.ts`

### Task 2: Real official source adapters

**Files:**
- Modify: `src/lib/adapters.ts`
- Modify: `src/lib/adapters.test.ts`
- Create: `tests/fixtures/codex/*.html`

Implement explicit parsers for Codex, Claude Code, Cursor, GitHub Copilot RSS and Gemini CLI releases. Verify Codex against real page structure and every adapter against representative official-format fixtures.

**Verification:** `npm test -- src/lib/adapters.test.ts`

### Task 3: Collection and weekly scripts

**Files:**
- Create: `src/lib/content-store.ts`
- Create: `src/lib/collector.ts`
- Create: `scripts/collect.ts`
- Create: `scripts/weekly.ts`
- Modify: `src/lib/ai.ts`

Persist normalized releases and validated explanations to JSON. Support dry-run and no-AI modes so the source layer remains testable without credentials.

**Verification:** `npm run collect -- --source codex --dry-run --no-ai --max-releases 5`

### Task 4: Fully static Next.js application

**Files:**
- Modify: `next.config.ts`
- Modify: `src/lib/data.ts`
- Modify: public pages under `src/app`
- Delete: `src/db`, `drizzle`, admin and runtime API routes

Read files during build, move filters to the client, generate every dynamic path with `generateStaticParams`, and remove runtime-only cookies, POST handlers and ISR.

**Verification:** `npm run build` creates `out/` with no server functions.

### Task 5: Scheduled Git publishing and full verification

**Files:**
- Modify: `.github/workflows/*.yml`
- Modify: `.env.example`, `README.md`, `MVP.md`, `package.json`

Collect every two hours, commit only changed content, invoke `VERCEL_DEPLOY_HOOK`, and generate weekly JSON. Document required secrets and run lint, typecheck, tests, build and Playwright.

**Verification:** `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`
