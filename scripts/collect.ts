import { collectOfficialUpdates } from "../src/lib/collector";
import { UPDATE_SOURCES, type UpdateSourceSlug } from "../src/lib/source-config";

function valueOf(name: string) {
  const direct = process.argv.find((value) => value.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const sourceArg = valueOf("--source") ?? "all";
  const valid = new Set<UpdateSourceSlug>(UPDATE_SOURCES.map((source) => source.slug));
  const sources = sourceArg === "all" ? [...valid] : sourceArg.split(",").map((value) => value.trim()).filter((value): value is UpdateSourceSlug => valid.has(value as UpdateSourceSlug));
  if (!sources.length) throw new Error(`No valid source selected: ${sourceArg}`);

  const results = await collectOfficialUpdates({
    sources,
    dryRun: process.argv.includes("--dry-run"),
    noAi: process.argv.includes("--no-ai"),
    force: process.argv.includes("--force"),
    maxReleases: Number(valueOf("--max-releases") ?? 10),
  });

  console.log(JSON.stringify({ collectedAt: new Date().toISOString(), results }, null, 2));
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
