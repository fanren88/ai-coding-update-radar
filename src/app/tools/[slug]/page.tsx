import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getTool, listToolParams } from "@/lib/data";

export const dynamicParams = false;
export async function generateStaticParams() { return listToolParams(); }

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) notFound();

  return (
    <div className="page-wrap py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-3.5"/>返回更新索引</Link>
      <header className="reveal mt-10 grid gap-8 border-b border-foreground/15 pb-12 sm:pb-16 md:grid-cols-[1fr_260px] md:items-end">
        <div><p className="eyebrow">工具档案 · {tool.vendor}</p><h1 className="editorial-title mt-6 text-6xl sm:text-8xl">{tool.name}</h1><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">{tool.description}</p></div>
        <div className="paper-card p-6"><p className="text-[10px] text-muted-foreground">已发布更新</p><p className="mt-2 font-editorial text-5xl number-tabular">{String(tool.updateCount).padStart(2, "0")}</p><a href={tool.officialUrl} target="_blank" rel="noreferrer" className="ink-link mt-5 inline-flex items-center gap-1.5 text-xs">访问官方网站 <ArrowUpRight className="size-3.5"/></a></div>
      </header>

      <section className="mt-12 sm:mt-16">
        <div className="mb-8 flex items-end justify-between"><div><p className="eyebrow">修订记录</p><h2 className="editorial-title mt-4 text-3xl">更新时间线</h2></div><p className="hidden text-xs text-muted-foreground sm:block">新 → 旧</p></div>
        <div className="relative border-l border-foreground/18 pl-6 sm:pl-10">
          {tool.updates.length ? tool.updates.map((item, index) => <Link key={item.id} href={`/updates/${item.id}`} className="group relative mb-5 block rounded-3xl border bg-card p-6 shadow-[var(--shadow-paper)] transition hover:-translate-y-0.5 hover:border-foreground/20 sm:p-7"><span className="absolute -left-[29px] top-8 size-2 rounded-full bg-background ring-1 ring-foreground sm:-left-[45px]"/><div className="flex flex-wrap items-center gap-2"><span className="font-editorial text-2xl text-foreground/25">{String(index + 1).padStart(2, "0")}</span><Badge variant="outline">{item.version ?? item.channel}</Badge><Badge variant="secondary">{item.category}</Badge><span className="ml-auto text-[10px] text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString("zh-CN")}</span></div><h3 className="mt-4 font-editorial text-2xl leading-snug group-hover:text-foreground/70">{item.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.what}</p></Link>) : <p className="paper-card p-8 text-sm text-muted-foreground">等待首次采集到可发布更新。</p>}
        </div>
      </section>
    </div>
  );
}
