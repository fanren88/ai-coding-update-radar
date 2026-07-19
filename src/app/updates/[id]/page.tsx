import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Terminal } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/ui/badge";
import { getUpdate, listUpdateParams } from "@/lib/data";

export const dynamicParams = false;
export async function generateStaticParams() { return listUpdateParams(); }

const importanceLabels: Record<string, string> = { must_handle: "需要处理", worth_trying: "值得尝试", good_to_know: "了解即可" };
const sectionNames = ["发生了什么", "影响谁", "现在做什么"];

export default async function UpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getUpdate(id);
  if (!item) notFound();
  const sections = [item.what, item.who, item.action];

  return (
    <div className="page-wrap py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-3.5"/>返回更新索引</Link>
      <header className="reveal mt-10 max-w-4xl border-b border-foreground/15 pb-12 sm:pb-16">
        <p className="eyebrow">更新档案 · {item.toolName}</p>
        <h1 className="editorial-title mt-6 text-4xl leading-[1.08] sm:text-6xl lg:text-7xl">{item.title}</h1>
        <div className="mt-7 flex flex-wrap items-center gap-2"><Badge>{item.toolName}</Badge><Badge variant={item.importance === "must_handle" ? "destructive" : "secondary"}>{importanceLabels[item.importance] ?? item.importance}</Badge><Badge variant="outline">{item.version ?? item.channel}</Badge><span className="ml-1 text-xs text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</span></div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
        <article className="space-y-5">
          {sections.map((content, index) => (
            <section key={sectionNames[index]} className="paper-card grid gap-5 p-6 sm:grid-cols-[110px_1fr] sm:p-8">
              <div><span className="font-editorial text-4xl text-foreground/25">0{index + 1}</span><h2 className="mt-2 text-xs font-medium">{sectionNames[index]}</h2></div>
              <MessageResponse className="text-[15px] leading-7 text-foreground/82">{content}</MessageResponse>
            </section>
          ))}

          {item.steps.length ? <section className="rounded-3xl bg-[#171713] p-6 text-[#f5f2eb] sm:p-8"><div className="mb-6 flex items-center gap-2 text-xs text-[#aaa69d]"><Terminal className="size-4"/>尝试步骤</div><ol className="space-y-4 font-mono text-sm leading-6">{item.steps.map((step, index) => <li key={step} className="flex gap-4"><span className="text-[#77736b]">{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>)}</ol></section> : null}

          <section className="rounded-3xl bg-muted p-6 sm:p-8">
            <p className="text-xs font-medium">官方证据摘录</p>
            <blockquote className="mt-5 border-l-2 border-[var(--clay)] pl-5 text-sm leading-7 text-muted-foreground">{item.evidence}</blockquote>
          </section>
        </article>

        <aside className="paper-card p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b pb-5"><p className="text-xs font-medium">档案索引</p><span className="size-2 rounded-full bg-[var(--clay)]"/></div>
          <dl className="divide-y text-sm">
            <div className="py-4"><dt className="text-[10px] text-muted-foreground">发布渠道</dt><dd className="mt-1">{item.channel}</dd></div>
            <div className="py-4"><dt className="text-[10px] text-muted-foreground">范围 / 分类</dt><dd className="mt-1">{item.scope} / {item.category}</dd></div>
            <div className="py-4"><dt className="text-[10px] text-muted-foreground">官方发布时间</dt><dd className="mt-1 text-xs leading-5">{new Date(item.publishedAt).toLocaleString("zh-CN")}</dd></div>
            <div className="py-4"><dt className="text-[10px] text-muted-foreground">整理方式</dt><dd className="mt-1 text-xs">{item.generatedBy === "ai" ? "AI 解释 + 证据校验" : "官方原文保守摘要"}</dd></div>
          </dl>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 flex w-full items-center justify-between rounded-lg bg-foreground px-4 py-3 text-sm text-background transition hover:bg-foreground/85">查看官方原文 <ArrowUpRight className="size-4"/></a>
        </aside>
      </div>
    </div>
  );
}
