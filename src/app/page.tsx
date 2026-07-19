import { CodexArchive } from "@/components/codex-archive";
import { loadContent } from "@/lib/content-store";

export default async function Home() {
  const content = await loadContent();
  const releases = new Map(content.releases.map((release) => [release.id, release]));
  const items = content.updates
    .filter((item) => item.toolSlug !== "github-copilot")
    .map((item) => {
      const release = releases.get(item.releaseId);
      const sourceLanguage = release?.sourceLanguage ?? "en";
      const original = release?.body ?? item.evidence;
      return {
        ...item,
        sourceLanguage,
        fullContentEn: sourceLanguage === "en" ? original : release?.translation?.bodyEn ?? original,
        fullContentZh: sourceLanguage === "zh" ? original : release?.translation?.bodyZh ?? null,
        hasContentEn: sourceLanguage === "en" || Boolean(release?.translation?.bodyEn),
        hasContentZh: sourceLanguage === "zh" || Boolean(release?.translation?.bodyZh),
      };
    });
  return <CodexArchive items={items}/>;
}
