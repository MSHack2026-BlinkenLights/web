import { PageShell } from "wbl/app/_components/ui/page-shell";
import { Skeleton, SkeletonGroup } from "wbl/app/_components/ui/skeleton";

/** Layout of the game page while the round loads. */
export default function Loading() {
  return (
    <PageShell width="medium">
      <SkeletonGroup label="Spiel wird geladen" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <Skeleton className="mx-auto aspect-square w-full max-w-64 rounded-2xl md:mx-0 md:w-56 md:shrink-0" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="mx-auto aspect-square w-full max-w-sm rounded-2xl" />
        </div>
      </SkeletonGroup>
    </PageShell>
  );
}
