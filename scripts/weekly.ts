import { hasAiCredentials, summarizeWeek } from "../src/lib/ai";
import { loadContent, saveContent } from "../src/lib/content-store";
import type { ContentUpdate, WeeklyDigest } from "../src/lib/content-schema";

function isoWeek(date: Date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return { year: utc.getUTCFullYear(), week: Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7) };
}

function entry(update: ContentUpdate) { return { id: update.id, reasonZh: update.action }; }

async function main() {
  const bundle = await loadContent();
  const now = new Date();
  const cutoff = now.getTime() - 8 * 86400000;
  const rows = bundle.updates.filter((update) => Date.parse(update.publishedAt) >= cutoff);
  const fallback = {
    introZh: `本周收录 ${rows.length} 条官方编程工具更新。`,
    mustHandle: rows.filter((row) => row.importance === "must_handle").map(entry),
    worthTrying: rows.filter((row) => row.importance === "worth_trying").map(entry),
    goodToKnow: rows.filter((row) => row.importance === "good_to_know").map(entry),
  };

  let summary = fallback;
  if (hasAiCredentials() && rows.length) {
    try {
      summary = await summarizeWeek(rows.map(({ id, title, importance }) => ({ id, title, importance })));
    } catch {
      summary = fallback;
    }
  }
  const current = isoWeek(now);
  const digest: WeeklyDigest = { ...current, generatedAt: now.toISOString(), ...summary };
  bundle.weekly = bundle.weekly.filter((item) => item.year !== current.year || item.week !== current.week);
  bundle.weekly.unshift(digest);
  await saveContent(bundle);
  console.log(JSON.stringify({ status: "created", ...current, updateCount: rows.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
