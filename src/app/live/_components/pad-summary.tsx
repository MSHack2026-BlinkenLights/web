import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
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
