"use client";

import { type CSSProperties, useState } from "react";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { ErrorState } from "wbl/app/_components/ui/states";
import { useLivePanels } from "wbl/app/_components/use-live-panels";
import { errorText } from "wbl/app/admin/_components/format";
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
 * Panels of a controller, streamed live, and its state, polled every few seconds.
 *
 * @param id - The controller's ID.
 * @returns The polling query, the current grid (streamed if available, else polled) and the
 * status badge, `undefined` while connecting.
 */
export function useControllerLive(id: string) {
  const live = api.admin.controllers.live.useQuery(
    { id },
    { refetchInterval: 5000, refetchIntervalInBackground: false },
  );
  const panels = useLivePanels(id);

  // The stream notices a (re)connect before the next poll does.
  const polled: string | undefined = live.data?.state;
  const state = !panels
    ? polled
    : !panels.online
      ? "offline"
      : !polled || polled === "offline"
        ? "idle"
        : polled;

  return {
    live,
    data: panels ?? live.data,
    badge: state ? STATE_BADGES[state] : undefined,
  };
}

/**
 * Status badge of a controller with a hint when it is offline.
 *
 * @param props - The badge from {@link useControllerLive} and whether the controller is online.
 * @returns The status line.
 */
export function LiveStatus({
  badge,
  online,
}: {
  badge: ReturnType<typeof useControllerLive>["badge"];
  online: boolean | undefined;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/60">
      {badge ? (
        <Badge tone={badge.tone}>{badge.label}</Badge>
      ) : (
        <Badge>Verbinde …</Badge>
      )}
      {online === false && "Zeigt den letzten bekannten Zustand."}
    </div>
  );
}

/**
 * Current panel colors of a controller, streamed live, and its state, polled every few seconds.
 * Clicking a panel paints it in the live view, with or without a running game; only with
 * "An Panel senden" does the controller show it too. Nothing is stored in a game.
 *
 * @param props - The controller's ID and its grid size from the database, used while loading.
 * @returns The paintable live grid with a status badge.
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
  const { live, data, badge } = useControllerLive(id);
  const [color, setColor] = useState("#22e4ff");
  const [erasing, setErasing] = useState(false);
  const [sendToPanel, setSendToPanel] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const paint = api.admin.controllers.paint.useMutation({
    onSuccess: ({ sent }, input) =>
      setNotice(
        input.sendToPanel && !sent
          ? "Controller offline: nur in der Vorschau gezeichnet."
          : null,
      ),
    onError: (error) => setNotice(errorText(error)),
  });

  if (live.isError && !data) {
    return (
      <ErrorState
        message="Keine Verbindung zum Controller."
        onRetry={() => void live.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <LiveStatus badge={badge} online={data?.online} />
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`flex min-h-12 items-center gap-2 rounded-full border px-4 text-sm ${erasing ? "border-white/20 text-white/60" : "border-neon-cyan/60 text-neon-cyan"}`}
        >
          <input
            type="color"
            value={color}
            onChange={(event) => {
              setColor(event.target.value);
              setErasing(false);
            }}
            className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          Malen
        </label>
        <Button
          variant="outline"
          tone={erasing ? "magenta" : "neutral"}
          icon="Erase"
          aria-pressed={erasing}
          onClick={() => setErasing((value) => !value)}
        >
          Ausschalten
        </Button>
        <label className="flex min-h-12 items-center gap-2 rounded-full px-4 text-sm text-white/80 hover:bg-white/10">
          <input
            type="checkbox"
            checked={sendToPanel}
            onChange={(event) => setSendToPanel(event.target.checked)}
          />
          An Panel senden
        </label>
      </div>
      {data ? (
        <div
          className={`grid w-full ${data.online ? "" : "opacity-50"}`}
          style={{
            gap: `${Math.min(4, 16 / data.width)}%`,
            gridTemplateColumns: `repeat(${data.width}, minmax(0, 1fr))`,
            aspectRatio: `${data.width} / ${data.height}`,
          }}
        >
          {Array.from({ length: data.width * data.height }, (_, i) => {
            const x = i % data.width;
            const y = Math.floor(i / data.width);
            const pixel = data.pixels[i] ?? null;
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  paint.mutate({
                    id,
                    x,
                    y,
                    colorHex: erasing ? "#000000" : color,
                    sendToPanel,
                  })
                }
                aria-label={`Pixel ${x}, ${y}${pixel ? `: ${pixel}` : ", aus"}`}
                title={`${x}, ${y}`}
                className={`focus-visible:outline-neon-cyan aspect-square rounded-[18%] transition-[background-color,box-shadow] hover:ring-2 hover:ring-white/40 focus-visible:outline-2 ${
                  pixel
                    ? "bg-(--pixel-color) shadow-[0_0_0.75rem_var(--pixel-color)]"
                    : "bg-pixel-off"
                }`}
                style={
                  pixel
                    ? ({ "--pixel-color": pixel } as CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </div>
      ) : (
        <PixelGrid
          width={width}
          height={height}
          pending
          label="Spielfeld wird geladen"
        />
      )}
      <FormStatus error={notice} />
    </div>
  );
}
