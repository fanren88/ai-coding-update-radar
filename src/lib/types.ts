export interface SourceFetchResult { body: string; status: number; etag: string | null; url: string; contentType: string; fetchedAt: Date; }
export interface OfficialRelease { externalId: string; version: string | null; channel: "nightly" | "preview" | "stable" | "ga" | "unknown"; publishedAt: Date; sourceUrl: string; title: string; body: string; contentHash: string; sourceTopics?: string[]; }
export interface UpdateSourceAdapter { fetch(etag?: string | null): Promise<SourceFetchResult>; parse(result: SourceFetchResult): OfficialRelease[]; }
