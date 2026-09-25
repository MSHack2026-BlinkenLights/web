"use client";

import { useQuery } from "@tanstack/react-query";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { fetchPadGridState } from "wbl/services/pad-state";
import { type PadGridState } from "wbl/types/pad";

interface LivePadGridProps {
  padId: string;
  /** Polling interval in ms. */
  refreshInterval?: number;
  /** Optional server-fetched state to avoid the initial loading state. */
  initialState?: PadGridState;
  /** Grid size shown while loading, before the pad reports its real size. */
  fallbackSize?: { width: number; height: number };
  className?: string;
}

export function LivePadGrid({
  padId,
  refreshInterval = 1000,
  initialState,
  fallbackSize = { width: 3, height: 3 },
  className = "",
}: LivePadGridProps) {
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ["pad", padId, "grid-state"],
    queryFn: () => fetchPadGridState(padId),
    initialData: initialState,
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: false,
  });

  if (isPending) {
    return (
      <PixelGrid
        {...fallbackSize}
        pending
        label="Spielfeld wird geladen"
        className={className}
      />
    );
  }

  if (isError && !data) {
    return (
      <div
        role="alert"
        className={`flex flex-col items-center gap-4 text-center ${className}`}
      >
        <p className="text-base text-white/80">
          Keine Verbindung zum Spielfeld
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="bg-neon-cyan text-surface min-h-12 rounded-full px-6 font-semibold disabled:opacity-60"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <PixelGrid
      width={data.width}
      height={data.height}
      pixels={data.pixels}
      label={`Aktuelles Muster auf dem Spielfeld, ${data.width}×${data.height} Pixel`}
      className={className}
    />
  );
}
