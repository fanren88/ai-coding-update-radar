import { CodexArchive } from "@/components/codex-archive";
import { loadContent } from "@/lib/content-store";

export default async function Home() {
  const content = await loadContent();
  const releases = new Map(content.releases.map((release) => [release.id, release]));
  const items = content.updates
    .filter((item) => item.toolSlug !== "github-copilot")
    .map((item) => ({
      ...item,
      fullContentEn: releases.get(item.releaseId)?.body ?? item.evidence,
      fullContentZh: releases.get(item.releaseId)?.translation?.bodyZh ?? null,
    }));
  return <CodexArchive items={items}/>;
}
