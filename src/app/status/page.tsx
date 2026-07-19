import Link from "next/link";
import { ArrowLeft, Check, Clock3, Minus } from "lucide-react";
import { listHealth } from "@/lib/data";

export default async function StatusPage() {
  const rows = await listHealth();
  const healthy = rows.filter((item) => item.status === "healthy").length;

  return (
    <div className="page-wrap py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition hover:text-foreground"><ArrowLeft className="size-3.5"/>返回更新索引</Link>
      <header className="reveal mt-10 grid gap-8 border-b border-foreground/15 pb-12 sm:pb-16 lg:grid-cols-[1fr_260px] lg:items-end">
        <div><p className="eyebrow">采集台账</p><h1 className="editorial-title mt-6 text-5xl sm:text-7xl">来源健康检查</h1><p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">这里展示仓库中最后一次采集的结果。浏览页面时不会请求官方站点，也不会唤醒任何数据库。</p></div>
        <div className="paper-card p-6"><p className="text-[10px] text-muted-foreground">正常来源</p><p className="mt-2 font-editorial text-5xl"><span className="number-tabular">{healthy}</span><span className="ml-2 text-2xl text-muted-foreground">/ {rows.length}</span></p></div>
      </header>

      <section className="mt-12 sm:mt-16">
        <div className="mb-5 grid grid-cols-[1fr_auto] border-b border-foreground/15 pb-3 text-[10px] uppercase tracking-[.14em] text-muted-foreground sm:grid-cols-[1.2fr_1fr_auto]"><span>Official source</span><span className="hidden sm:block">Last collected</span><span>Status</span></div>
        <div className="grid gap-3">
          {rows.map((item, index) => {
            const Icon = item.status === "healthy" ? Check : item.status === "waiting" ? Clock3 : Minus;
            return <div key={item.slug} className="paper-card grid grid-cols-[1fr_auto] items-center gap-5 p-5 sm:grid-cols-[1.2fr_1fr_auto] sm:p-6"><div className="flex items-center gap-4"><span className="font-editorial text-2xl text-foreground/20">{String(index + 1).padStart(2, "0")}</span><div><p className="text-sm font-medium">{item.slug}</p><p className="mt-1 text-[10px] text-muted-foreground sm:hidden">{item.lastSuccessAt ? new Date(item.lastSuccessAt).toLocaleString("zh-CN") : "等待首次采集"}</p></div></div><p className="hidden text-xs text-muted-foreground sm:block">{item.lastSuccessAt ? new Date(item.lastSuccessAt).toLocaleString("zh-CN") : "等待首次采集"}{item.lastError ? ` · ${item.lastError}` : ""}</p><div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[11px]"><Icon className="size-3.5"/>{item.status === "healthy" ? "正常" : item.status === "waiting" ? "等待" : `异常 ${item.consecutiveErrors}`}</div></div>;
          })}
        </div>
      </section>
    </div>
  );
}
