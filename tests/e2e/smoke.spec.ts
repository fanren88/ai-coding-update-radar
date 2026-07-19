import { expect, test } from "@playwright/test";

test("home, five-tool directory and full official content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Codex changelog" })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText("全部更新", { exact: true })).toHaveCount(0);
  await expect(page.getByText("GitHub Copilot", { exact: true })).toHaveCount(0);
  const toolDirectory = page.getByRole("navigation", { name: /工具目录|Tool directory/ });
  await expect(toolDirectory.getByRole("button")).toHaveCount(5);
  await expect(page.getByText("Codex categories", { exact: true })).toHaveCount(0);
  const topicDirectory = page.getByRole("navigation", { name: /Codex (?:更新分类|update categories)/ });
  await expect(topicDirectory.getByRole("button")).toHaveCount(5);
  await toolDirectory.getByRole("button", { name: /Claude Code/ }).click();
  await expect(page.getByRole("heading", { name: "Claude Code changelog" })).toBeVisible();
  await toolDirectory.getByRole("button", { name: /WorkBuddy/ }).click();
  await expect(page.getByRole("heading", { name: "WorkBuddy changelog" })).toBeVisible();
  await expect(page.getByText(/新增助理配额上限六档套餐文案/).first()).toBeVisible();
  await toolDirectory.getByRole("button", { name: /Codex/ }).click();
  await topicDirectory.getByRole("button", { name: "ChatGPT desktop app" }).click();
  await expect(page.getByText("New features", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Edit Markdown and code directly in the app/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /详情/ })).toHaveCount(0);
});

test("language switch persists and keeps proper names in English", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "中文" }).click();
  await expect(page.getByRole("heading", { name: "Codex 更新日志" })).toBeVisible();
  await expect(page.getByText("Codex CLI", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Codex 更新日志" })).toBeVisible();
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { name: "Codex changelog" })).toBeVisible();
});

test("weekly digest groups updates", async ({ page }) => {
  await page.goto("/weekly/2026/29");
  await expect(page.getByRole("heading", { name: "本周更新速读" })).toBeVisible();
  await expect(page.getByText("必须处理")).toBeVisible();
});
