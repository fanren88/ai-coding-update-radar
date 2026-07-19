import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="page-wrap space-y-5 py-16"><Skeleton className="h-4 w-32"/><Skeleton className="h-28 w-4/5 rounded-3xl"/><Skeleton className="h-36 w-full rounded-3xl"/><Skeleton className="h-44 w-full rounded-3xl"/><Skeleton className="h-44 w-full rounded-3xl"/></div>;
}
