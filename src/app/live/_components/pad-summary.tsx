import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { Skeleton, SkeletonGroup } from "wbl/app/_components/ui/skeleton";
import { formatDistance } from "wbl/utils/geo";

import { PAD_STATUS, type Pad } from "./pads";

/**
 * Row content for a pad: status icon, name, status line, free seats and
 * distance. The caller wraps it in a button or link.
 */
export function PadSummary({ pad, distance }: { pad: Pad; distance?: number }) {
  const status = PAD_STATUS[pad.status];
  const freeSlots = pad.playRequests.reduce(
    (sum, request) => sum + request.freeSlots,
    0,
  );

  return (
    <>
      <DynamicIcon
        name={status.icon}
        size={24}
        className={`shrink-0 ${status.textClass}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{pad.name}</span>
        <span className="block truncate text-sm text-white/60">
          <span className={status.textClass}>{status.label}</span>
          {pad.game && ` · ${pad.game}`}
          {` · ${pad.width} × ${pad.height}`}
        </span>
        {freeSlots > 0 && (
          <span className="text-neon-green mt-0.5 flex items-center gap-1 text-sm">
            <DynamicIcon name="UserPlus" size={16} />
            {freeSlots === 1 ? "1 Platz frei" : `${freeSlots} Plätze frei`}
          </span>
        )}
      </span>
      {distance !== undefined && (
        <span className="shrink-0 text-sm text-white/70">
          {formatDistance(distance)}
        </span>
      )}
    </>
  );
}

/** Placeholder rows shaped like pad rows with {@link PadSummary}. */
export function PadRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonGroup
      label="Spielfelder werden geladen"
      className="flex flex-col gap-2"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 px-3 py-2"
        >
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-3.5 w-44 max-w-full" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
