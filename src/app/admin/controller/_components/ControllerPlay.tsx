"use client";

import { type CSSProperties, useEffect, useState } from "react";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Section } from "wbl/app/_components/ui/section";
import { ErrorState } from "wbl/app/_components/ui/states";
import { errorText } from "wbl/app/admin/_components/format";
import { AdminHeader } from "wbl/app/admin/_components/ui";
import { api, type RouterOutputs } from "wbl/trpc/react";
import { ControllerConsole } from "./ControllerConsole";
import { LiveStatus, useControllerLive } from "./ControllerLive";

type ControllerDetails = RouterOutputs["admin"]["controllers"]["get"];

const PRESS_FEEDBACK_MS = 200;

/**
 * Remote control of a controller: pressing a panel sends a simulated `buttonPress` to the
 * controller, which runs the game logic and reports its colors back live. The console shows the
 * messages in both directions.
 *
 * @param props - The controller as loaded on the server.
 * @returns The page content.
 */
export function ControllerPlay({
  controller,
}: {
  controller: ControllerDetails;
}) {
  const { live, data, badge } = useControllerLive(controller.id);
  const [pressed, setPressed] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const press = api.admin.controllers.press.useMutation({
    onSuccess: ({ sent }) =>
      setNotice(sent ? null : "Controller offline: Druck nicht gesendet."),
    onError: (error) => setNotice(errorText(error)),
  });

  useEffect(() => {
    if (pressed === null) return;
    const timeout = setTimeout(() => setPressed(null), PRESS_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [pressed]);

  const detailHref = `/admin/controller/${controller.id}`;

  return (
    <>
      <AdminHeader
        title={`Steuern: ${controller.name}`}
        description="Tippe auf ein Panel, als würdest du darauf treten. Die Spiellogik läuft auf dem Controller."
        back={{ href: detailHref, label: controller.name }}
      />
      <Section
        title="Spielfeld"
        icon="Gamepad"
        description="Jeder Druck geht als buttonPress an den Controller; seine Antworten erscheinen live."
      >
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
          <div className="flex flex-col gap-3">
            <LiveStatus badge={badge} online={data?.online} />
            {live.isError && !data ? (
              <ErrorState
                message="Keine Verbindung zum Controller."
                onRetry={() => void live.refetch()}
              />
            ) : data ? (
              <div
                className={`grid w-full touch-manipulation select-none ${data.online ? "" : "opacity-50"}`}
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
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        setPressed(i);
                        press.mutate({ id: controller.id, x, y });
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        setPressed(i);
                        press.mutate({ id: controller.id, x, y });
                      }}
                      aria-label={`Panel ${x}, ${y} drücken${pixel ? ` (${pixel})` : ""}`}
                      title={`${x}, ${y}`}
                      className={`focus-visible:outline-neon-cyan aspect-square rounded-[18%] transition-[background-color,box-shadow,transform] hover:ring-2 hover:ring-white/40 focus-visible:outline-2 ${
                        pressed === i ? "scale-90 ring-2 ring-white" : ""
                      } ${
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
                width={controller.width}
                height={controller.height}
                pending
                label="Spielfeld wird geladen"
              />
            )}
            <FormStatus error={notice} />
          </div>
          {/* Out of the grid flow on wide screens, so the console scrolls at the grid's height instead of growing. */}
          <div className="relative h-72 md:h-auto">
            <ControllerConsole
              controllerId={controller.id}
              className="h-full md:absolute md:inset-0"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
