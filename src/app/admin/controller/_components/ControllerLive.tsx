"use client";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { ErrorState } from "wbl/app/_components/ui/states";
import { Badge } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";

const STATE_BADGES: Record<
  string,
  { label: string; tone: "green" | "cyan" | "magenta" | "neutral" }
> = {
  running: { label: "Spiel läuft", tone: "green" },
  idle: { label: "Online", tone: "cyan" },
  offline: { label: "Offline", tone: "neutral" },
  error: { label: "Fehler", tone: "magenta" },
};

/**
 * Current panel colors and state of a controller, polled from the bridge every second.
 *
 * @param props - The controller's ID and its grid size from the database, used while loading.
 * @returns The live grid with a status badge.
 */
export function ControllerLive({
  id,
  width,
  height,
}: {
  id: string;
  width: number;
  height: number;
}) {
  const live = api.admin.controllers.live.useQuery(
    { id },
    { refetchInterval: 1000, refetchIntervalInBackground: false },
  );

  if (live.isError && !live.data) {
    return (
      <ErrorState
        message="Keine Verbindung zum Controller."
        onRetry={() => void live.refetch()}
      />
    );
  }

  const data = live.data;
  const badge = data ? STATE_BADGES[data.state] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-white/60">
        {badge ? (
          <Badge tone={badge.tone}>{badge.label}</Badge>
        ) : (
          <Badge>Verbinde …</Badge>
        )}
        {data && !data.online && "Zeigt den letzten bekannten Zustand."}
      </div>
      <PixelGrid
        width={data?.width ?? width}
        height={data?.height ?? height}
        pixels={data?.pixels}
        pending={!data}
        label={
          data
            ? `Aktuelles Muster auf dem Controller, ${data.width}×${data.height} Pixel`
            : "Spielfeld wird geladen"
        }
        className={data && !data.online ? "opacity-50" : ""}
      />
    </div>
  );
}
