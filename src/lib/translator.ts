import { z } from "zod";
import type { ContentRelease, ReleaseTranslation } from "./content-schema";

const DEFAULT_MODEL = "deepseek-v4-flash";
const API_URL = "https://api.deepseek.com/chat/completions";

const translatedContentSchema = z.object({
  titleTranslated: z.string().min(1),
  bodyTranslated: z.string().min(1),
});

const deepSeekResponseSchema = z.object({
  model: z.string().min(1),
  choices: z.array(z.object({
    finish_reason: z.string(),
    message: z.object({ content: z.string().nullable() }),
  })).min(1),
});

export interface TranslateOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

const fencedBlocks = (value: string) => value.match(/```[\s\S]*?```/g) ?? [];
const inlineCode = (value: string) => value.match(/(?<!`)`[^`\n]+`(?!`)/g) ?? [];
const headings = (value: string) => value.match(/^#{1,6}\s+/gm)?.length ?? 0;
const listItems = (value: string) => value.match(/^\s*(?:[-*+] |\d+\. )/gm)?.length ?? 0;

function assertStructurePreserved(source: string, translated: string) {
  if (headings(source) !== headings(translated)) throw new Error("translation_heading_mismatch");
  if (listItems(source) !== listItems(translated)) throw new Error("translation_list_mismatch");
  if (JSON.stringify(fencedBlocks(source)) !== JSON.stringify(fencedBlocks(translated))) throw new Error("translation_code_block_mismatch");
  if (JSON.stringify(inlineCode(source)) !== JSON.stringify(inlineCode(translated))) throw new Error("translation_inline_code_mismatch");
}

export const hasDeepSeekCredentials = () => Boolean(process.env.DEEPSEEK_API_KEY);

export function detectSourceLanguage(value: string): "en" | "zh" {
  const prose = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]+`/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const hanCount = prose.match(/\p{Script=Han}/gu)?.length ?? 0;
  const latinCount = prose.match(/[A-Za-z]/g)?.length ?? 0;
  const languageCharacters = hanCount + latinCount;
  return hanCount >= 4 && languageCharacters > 0 && hanCount / languageCharacters >= 0.2 ? "zh" : "en";
}

export const translationIsFresh = (release: ContentRelease) => (
  release.translation?.sourceHash === release.contentHash
  && release.translation.sourceLanguage === release.sourceLanguage
  && (release.sourceLanguage === "en" ? Boolean(release.translation.bodyZh) : Boolean(release.translation.bodyEn))
);

export async function translateRelease(release: ContentRelease, options: TranslateOptions = {}): Promise<ReleaseTranslation> {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("missing_deepseek_api_key");

  const model = options.model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
  const sourceLanguage = release.sourceLanguage ?? detectSourceLanguage(`${release.title}\n${release.body}`);
  const targetLanguage = sourceLanguage === "en" ? "zh" : "en";
  const direction = sourceLanguage === "en"
    ? "把输入中的普通英文完整翻译成自然、简洁的中文"
    : "Translate all ordinary Chinese content into concise, natural English";
  const request = options.fetchImpl ?? fetch;
  const response = await request(API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "You are a precise translator for AI coding-tool release notes.",
            `${direction}. Do not summarize, omit, or add information.`,
            "Keep product names, app names, company names, model names, API, CLI, PR, Markdown, macOS, Windows, GitHub, versions, commands, parameters, file paths, and code in their established English form.",
            "Preserve Markdown heading levels, list count and order, fenced code blocks, and inline code exactly.",
            "Return JSON only: {\"titleTranslated\":\"...\",\"bodyTranslated\":\"...\"}.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({ title: release.title, body: release.body }),
        },
      ],
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8_192,
      stream: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) throw new Error(`deepseek_http_${response.status}`);
  const payload = deepSeekResponseSchema.parse(await response.json());
  const choice = payload.choices[0];
  if (choice.finish_reason === "length") throw new Error("deepseek_output_truncated");
  if (!choice.message.content) throw new Error("deepseek_empty_output");

  const translated = translatedContentSchema.parse(JSON.parse(choice.message.content));
  assertStructurePreserved(release.body, translated.bodyTranslated);

  return {
    sourceLanguage,
    targetLanguage,
    titleEn: sourceLanguage === "en" ? release.title : translated.titleTranslated,
    bodyEn: sourceLanguage === "en" ? release.body : translated.bodyTranslated,
    titleZh: sourceLanguage === "zh" ? release.title : translated.titleTranslated,
    bodyZh: sourceLanguage === "zh" ? release.body : translated.bodyTranslated,
    sourceHash: release.contentHash,
    model: payload.model || model,
    translatedAt: new Date().toISOString(),
  };
}
