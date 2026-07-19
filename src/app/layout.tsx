import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { loadContent } from "@/lib/content-store";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DevPatch · 编程工具更新公报", template: "%s · DevPatch" },
  description: "从官方来源整理的 AI 编程工具更新公报。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const latestWeekly = (await loadContent()).weekly[0];

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-50 border-b border-border/70 bg-background/94 backdrop-blur-md">
          <div className="page-wrap flex h-[68px] items-center justify-between">
            <Link href="/" className="group flex items-center gap-3" aria-label="DevPatch 首页">
              <span className="grid size-9 place-items-center rounded-lg bg-foreground font-editorial text-lg text-background transition-transform group-hover:-rotate-3">D</span>
              <span>
                <span className="block text-[15px] font-medium tracking-[-.01em]">DevPatch</span>
                <span className="block text-[9px] tracking-[.18em] text-muted-foreground">更新公报</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm text-foreground/75" aria-label="主要导航">
              {latestWeekly ? <Link href={`/weekly/${latestWeekly.year}/${latestWeekly.week}`} className="rounded-lg px-3 py-2 transition hover:bg-muted hover:text-foreground"><span className="mr-1.5 hidden text-[10px] text-muted-foreground sm:inline">01</span>周报</Link> : null}
              <Link href="/status" className="rounded-lg px-3 py-2 transition hover:bg-muted hover:text-foreground"><span className="mr-1.5 hidden text-[10px] text-muted-foreground sm:inline">02</span>来源状态</Link>
            </nav>
          </div>
        </header>
        <TooltipProvider><main className="flex-1">{children}</main></TooltipProvider>
        <footer className="mt-20 bg-[#11110f] text-[#aaa69d]">
          <div className="page-wrap grid gap-10 py-14 md:grid-cols-[1.3fr_.7fr_.7fr]">
            <div>
              <div className="flex items-center gap-3 text-[#f5f2eb]"><span className="grid size-9 place-items-center rounded-lg bg-[#f5f2eb] font-editorial text-lg text-[#11110f]">D</span><span className="font-medium">DevPatch</span></div>
              <p className="mt-5 max-w-sm text-sm leading-6">把散落在官方更新日志里的变化，整理成开发者能快速读懂、核验和采取行动的更新公报。</p>
            </div>
            <div className="text-sm">
              <p className="mb-4 text-[10px] uppercase tracking-[.18em] text-[#6f6c65]">Archive</p>
              {latestWeekly ? <Link href={`/weekly/${latestWeekly.year}/${latestWeekly.week}`} className="block py-1.5 hover:text-[#f5f2eb]">本周速读</Link> : null}
              <Link href="/status" className="block py-1.5 hover:text-[#f5f2eb]">采集状态</Link>
            </div>
            <div className="text-sm">
              <p className="mb-4 text-[10px] uppercase tracking-[.18em] text-[#6f6c65]">Principle</p>
              <p className="leading-6">只引用官方来源<br/>AI 负责解释<br/>证据负责定论</p>
              <p className="mt-4 inline-block border-b border-[#4b4944] pb-1 text-xs">Git 驱动内容</p>
            </div>
          </div>
          <div className="border-t border-white/10 py-5"><div className="page-wrap flex flex-wrap justify-between gap-2 text-[10px] tracking-[.12em]"><span>DEVPATCH / STATIC EDITION</span><span>OFFICIAL SOURCES ONLY</span></div></div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
