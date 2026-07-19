import { loadContent, saveContent } from "../src/lib/content-store";
import { translateRelease, translationIsFresh } from "../src/lib/translator";

function valueOf(name: string) {
  const direct = process.argv.find((value) => value.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error("请通过临时环境变量设置 DEEPSEEK_API_KEY");

  const source = valueOf("--source") ?? "all";
  const limit = Math.max(1, Number(valueOf("--limit") ?? Number.MAX_SAFE_INTEGER));
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");
  const content = await loadContent();
  const candidates = content.releases
    .filter((release) => source === "all" || release.sourceSlug === source)
    .filter((release) => force || !translationIsFresh(release))
    .slice(0, limit);

  let translated = 0;
  const failures: Array<{ id: string; error: string }> = [];
  for (const [index, release] of candidates.entries()) {
    try {
      const translation = await translateRelease(release);
      const stored = content.releases.find((item) => item.id === release.id);
      if (stored) stored.translation = translation;
      translated += 1;
      if (!dryRun) await saveContent(content);
      console.log(`[${index + 1}/${candidates.length}] translated ${release.sourceSlug} ${release.version ?? release.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      failures.push({ id: release.id, error: message });
      console.error(`[${index + 1}/${candidates.length}] failed ${release.id}: ${message}`);
    }
  }

  console.log(JSON.stringify({ source, candidates: candidates.length, translated, failed: failures.length, dryRun, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
