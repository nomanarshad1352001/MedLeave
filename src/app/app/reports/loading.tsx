import { Card, Skeleton, SkeletonCard, SkeletonRows } from "@/components/ui";

export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-3 w-[32rem] max-w-full" />
      </div>
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Skeleton className="h-3 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-32 rounded-full" />
        ))}
      </Card>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="mb-4 h-4 w-56" />
        <SkeletonRows rows={6} />
      </Card>
    </div>
  );
}
