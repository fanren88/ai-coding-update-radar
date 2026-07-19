import Link from "next/link";
import { MessageResponse } from "@/components/ai-elements/message";
import type { ContentUpdate } from "@/lib/content-schema";

export function UpdateFeed({ items, tools }: { items: ContentUpdate[]; tools: Array<{ slug: string; name: string }> }) {
  return (
    <section className="reveal reveal-delay-2 py-14 sm:py-20">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="eyebrow">编辑部索引</p><h2 className="editorial-title mt-4 text-3xl sm:text-4xl">最近更新</h2></div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">四个工具直接展开，下方按官方发布时间收录更新。</p>
      </div>

      <nav className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border lg:grid-cols-4" aria-label="工具索引">
        {tools.map((tool) => <Link key={tool.slug} href={`/tools/${tool.slug}`} className="flex items-center justify-between bg-card px-5 py-5 text-sm font-medium transition hover:bg-muted"><span>{tool.name}</span><span className="text-[10px] font-normal text-muted-foreground">{items.filter((item) => item.toolSlug === tool.slug).length}</span></Link>)}
      </nav>

      <div className="mb-4 flex items-center justify-between border-b border-foreground/15 pb-3 text-[11px] text-muted-foreground"><span>共 {items.length} 条记录</span><span className="hidden sm:inline">按官方发布时间倒序</span></div>
      <div className="overflow-hidden rounded-3xl border bg-card">
        {items.length === 0 ? <div className="py-20 text-center text-sm text-muted-foreground">没有找到匹配的已发布更新。</div> : items.map((item) => (
          <Link key={item.id} href={`/updates/${item.id}`} aria-label={`${item.version ?? "未标版本"} 详情`} className="grid grid-cols-[100px_minmax(0,1fr)] gap-x-5 gap-y-4 border-b px-5 py-6 transition last:border-b-0 hover:bg-muted/55 sm:grid-cols-[140px_180px_minmax(0,1fr)] sm:gap-7 sm:px-7 sm:py-8">
            <time dateTime={item.publishedAt} className="text-xs leading-7 text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString("zh-CN")}</time>
            <p className="font-editorial text-xl leading-7">{item.version ?? "未标版本"}</p>
            <MessageResponse className="col-span-2 text-sm leading-7 text-muted-foreground sm:col-span-1">{item.evidence}</MessageResponse>
          </Link>
        ))}
      </div>
    </section>
  );
}
