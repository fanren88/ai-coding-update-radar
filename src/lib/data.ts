import { loadContent } from "./content-store";
import { UPDATE_SOURCES } from "./source-config";

export async function listUpdates(filters?: { tool?: string; category?: string; scope?: string; importance?: string }) {
  const { updates } = await loadContent();
  return updates.filter((item) => (!filters?.tool || item.toolSlug === filters.tool) && (!filters?.category || item.category === filters.category) && (!filters?.scope || item.scope === filters.scope) && (!filters?.importance || item.importance === filters.importance));
}

export async function getUpdate(id: string) { return (await listUpdates()).find((item) => item.id === id) ?? null; }

export async function listTools() {
  const updates = await listUpdates();
  return UPDATE_SOURCES.map((source) => ({ slug: source.slug, name: source.tool, vendor: source.vendor, officialUrl: source.officialUrl, description: source.description, updateCount: updates.filter((update) => update.toolSlug === source.slug).length }));
}

export async function getTool(slug: string) { const tool = (await listTools()).find((item) => item.slug === slug); return tool ? { ...tool, updates: await listUpdates({ tool: slug }) } : null; }
export async function listHealth() { return (await loadContent()).sources; }
export async function getWeekly(year: number, week: number) { return (await loadContent()).weekly.find((item) => item.year === year && item.week === week) ?? null; }
export async function listUpdateParams() { return (await listUpdates()).map(({ id }) => ({ id })); }
export async function listToolParams() { return (await listTools()).map(({ slug }) => ({ slug })); }
export async function listWeeklyParams() { return (await loadContent()).weekly.map(({ year, week }) => ({ year: String(year), week: String(week) })); }
