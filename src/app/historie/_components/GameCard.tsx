import Link from "next/link";
import { type ReactNode } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { formatDay, formatTime } from "wbl/utils/time";

interface GameCardProps {
  gameId: string;
  gameName: string;
  padName: string;
  endedAt: Date;
  /** Final picture of the round, if known. */
  preview?: ReactNode;
}

/** A claimed round in the history, linking to its page. */
export function GameCard({
  gameId,
  gameName,
  padName,
  endedAt,
  preview,
}: GameCardProps) {
  return (
    <li>
      <Link
        href={`/spiele/${gameId}`}
        className="bg-pixel-off/60 focus-visible:outline-neon-cyan flex min-h-12 items-center gap-4 rounded-2xl border border-white/10 p-3 transition-colors hover:border-white/25 hover:bg-white/5 focus-visible:outline-2"
      >
        <div className="flex w-14 shrink-0 items-center justify-center">
          {preview ?? (
            <DynamicIcon name="ViewGrid" size={28} className="text-white/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{gameName}</p>
          <p className="truncate text-sm text-white/60">
            {padName} · {formatDay(endedAt)}, {formatTime(endedAt)} Uhr
          </p>
        </div>
        <DynamicIcon
          name="NavArrowRight"
          size={20}
          className="shrink-0 text-white/40"
        />
      </Link>
    </li>
  );
}
