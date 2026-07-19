import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { getWeekly, listUpdates, listWeeklyParams } from "@/lib/data";

export const dynamicParams = false;
export async function generateStaticParams() { return listWeeklyParams(); }

export default async function WeeklyPage({ params }: { params: Promise<{ year: string; week: string }> }) {
  const value = await params;
  const digest = await getWeekly(Number(value.year), Number(value.week));
  if (!digest) notFound();
  const updates = await listUpdates();
  const byId = new Map(updates.map((item) => [item.id, item]));
  const groups = [
    { key: "mustHandle", title: "必须处理", note: "需要立即评估或安排的变化" },
    { key: "worthTrying", title: "值得尝试", note: "可能改善当前工作流的新能力" },
    { key: "goodToKnow", title: "了解即可", note: "保留在认知地图里的背景更新" },
  ] as const;

  return (
    <div className="page-wrap py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-3.5"/>返回更新索引</Link>
      <header className="reveal mt-10 grid gap-8 border-b border-foreground/15 pb-12 sm:pb-16 lg:grid-cols-[1fr_300px] lg:items-end">
        <div><p className="eyebrow">周刊 · {value.year} 年第 {value.week} 周</p><h1 className="editorial-title mt-6 text-5xl leading-tight sm:text-7xl">本周更新速读</h1><MessageResponse className="mt-7 max-w-2xl text-[15px] leading-7 text-muted-foreground">{digest.introZh}</MessageResponse></div>
        <div className="rounded-3xl bg-muted p-7"><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Reading note</p><p className="mt-4 font-editorial text-2xl leading-snug">先处理必须项，再挑一件值得尝试的新能力。</p></div>
      </header>

      <div className="mt-12 grid gap-6 sm:mt-16">
        {groups.map((group, index) => (
          <section key={group.key} className="paper-card grid gap-8 p-6 sm:p-8 lg:grid-cols-[220px_1fr]">
            <div><span className="font-editorial text-5xl text-foreground/20">0{index + 1}</span><h2 className="mt-4 font-editorial text-2xl">{group.title}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{group.note}</p></div>
            <div className="divide-y">
              {digest[group.key].length === 0 ? <p className="py-6 text-sm text-muted-foreground">本周无此类更新。</p> : digest[group.key].map((entry) => { const item = byId.get(entry.id); return <Link key={entry.id} href={`/updates/${entry.id}`} className="group flex gap-4 py-5 first:pt-0 last:pb-0"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--clay)]"/><div><p className="font-editorial text-xl leading-snug group-hover:text-foreground/65">{item?.title ?? entry.id}</p><MessageResponse className="mt-2 text-sm leading-6 text-muted-foreground">{entry.reasonZh}</MessageResponse></div><ArrowUpRight className="ml-auto size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"/></Link>; })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
