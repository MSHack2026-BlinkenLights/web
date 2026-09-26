"use client";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { ErrorState } from "wbl/app/_components/ui/states";
import { useLivePanels } from "wbl/app/_components/use-live-panels";
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
 * Current panel colors of a controller, streamed live, and its state, polled every few seconds.
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
    { refetchInterval: 5000, refetchIntervalInBackground: false },
  );
  const panels = useLivePanels(id);

  if (live.isError && !live.data && !panels) {
    return (
      <ErrorState
        message="Keine Verbindung zum Controller."
        onRetry={() => void live.refetch()}
      />
    );
  }

  const data = panels ?? live.data;
  // The stream notices a (re)connect before the next poll does.
  const polled: string | undefined = live.data?.state;
  const state = !panels
    ? polled
    : !panels.online
      ? "offline"
      : !polled || polled === "offline"
        ? "idle"
        : polled;
  const badge = state ? STATE_BADGES[state] : undefined;

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
