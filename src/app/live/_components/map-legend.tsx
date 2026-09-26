import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

import { PAD_STATUS, type PadStatus } from "./pads";
import { padMarkerHtml } from "./pad-marker";

/** Collapsible legend for the pin colors, overlaid on the map. */
export function MapLegend({ className = "" }: { className?: string }) {
  return (
    <details
      className={`group bg-surface/90 rounded-xl border border-white/10 text-sm backdrop-blur ${className}`}
    >
      <summary className="focus-visible:outline-neon-cyan flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-3 font-semibold focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        <DynamicIcon name="InfoCircle" size={20} className="text-white/70" />
        Legende
        <DynamicIcon
          name="NavArrowDown"
          size={16}
          className="text-white/50 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="flex flex-col gap-2 px-3 pb-3">
        {(Object.keys(PAD_STATUS) as PadStatus[]).map((key) => {
          const status = PAD_STATUS[key];
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-6 shrink-0 p-0.5"
                // Static markup from pad-marker.ts, identical to the map pins.
                dangerouslySetInnerHTML={{ __html: padMarkerHtml(key) }}
              />
              {status.label}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
