import { z } from "zod";
import type { ContentRelease, ReleaseTranslation } from "./content-schema";

const DEFAULT_MODEL = "deepseek-v4-flash";
const API_URL = "https://api.deepseek.com/chat/completions";

const translatedContentSchema = z.object({
  titleZh: z.string().min(1),
  bodyZh: z.string().min(1),
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

export const translationIsFresh = (release: ContentRelease) => (
  release.translation?.sourceHash === release.contentHash
);

export async function translateRelease(release: ContentRelease, options: TranslateOptions = {}): Promise<ReleaseTranslation> {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("missing_deepseek_api_key");

  const model = options.model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;
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
            "你是严谨的 AI 编程工具更新日志译者。",
            "把输入中的普通英文完整翻译成自然、简洁的中文，不要总结、删减或增加信息。",
            "保留产品名、App 名、公司名、模型名、API、CLI、PR、Markdown、macOS、Windows、GitHub、版本号、命令、参数、文件路径和代码为英文。",
            "必须原样保留 Markdown 标题层级、列表数量与顺序、代码块和行内代码。",
            "只返回 JSON，格式为 {\"titleZh\":\"...\",\"bodyZh\":\"...\"}。",
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
  assertStructurePreserved(release.body, translated.bodyZh);

  return {
    ...translated,
    sourceHash: release.contentHash,
    model: payload.model || model,
    translatedAt: new Date().toISOString(),
  };
}
