"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page-wrap py-24 text-center"><p className="eyebrow">档案读取异常</p><h1 className="editorial-title mt-6 text-4xl sm:text-5xl">这一页暂时没有展开。</h1><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-muted-foreground">官方发布原文仍保存在内容仓库中，你可以稍后重试。</p><Button className="mt-7 px-5" onClick={reset}>重新读取</Button></div>;
}
