import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { contentBundleSchema, releaseSchema, reviewUpdateSchema, sourceStateSchema, updateSchema, weeklyDigestSchema, type ContentBundle } from "./content-schema";

const files = {
  releases: ["releases.json", releaseSchema.array()],
  updates: ["updates.json", updateSchema.array()],
  review: ["review.json", reviewUpdateSchema.array()],
  sources: ["sources.json", sourceStateSchema.array()],
  weekly: ["weekly.json", weeklyDigestSchema.array()],
} as const;

export const defaultContentRoot = () => join(process.cwd(), "content");
export const stableId = (prefix: string, value: string) => `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function loadContent(root = defaultContentRoot()): Promise<ContentBundle> {
  const entries = await Promise.all(Object.entries(files).map(async ([key, [filename, schema]]) => [key, schema.parse(await readJson(join(root, filename)))]));
  return contentBundleSchema.parse(Object.fromEntries(entries));
}

async function writeJsonAtomic(path: string, value: unknown) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function saveContent(bundle: ContentBundle, root = defaultContentRoot()) {
  const validated = contentBundleSchema.parse(bundle);
  await mkdir(root, { recursive: true });
  await Promise.all(Object.entries(files).map(([key, [filename]]) => writeJsonAtomic(join(root, filename), validated[key as keyof ContentBundle])));
}
