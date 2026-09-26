"use client";

import { type CSSProperties, type ReactNode, type RefObject } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { Button } from "wbl/app/_components/ui/button";

import { PAD_STATUS, type Pad } from "./pads";

/** Connection to the controller: first event pending, live, or last known state. */
export type LiveConnection = "connecting" | "live" | "offline";

interface LivePadFullscreenProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  pad: Pad;
  connection: LiveConnection;
  width: number;
  height: number;
  /** The live grid, shared with the small preview. */
  grid: ReactNode;
}

/** Frame padding plus inner padding on both sides, see `p-4` below. */
const FRAME_INSET = "3rem";

/**
 * Full-screen view of a pad's live grid in the top layer, above map, header
 * and bottom bar. The grid fills the free space and keeps its aspect ratio.
 */
export function LivePadFullscreen({
  dialogRef,
  pad,
  connection,
  width,
  height,
  grid,
}: LivePadFullscreenProps) {
  const titleId = `live-pad-fullscreen-${pad.id}`;
  const status = PAD_STATUS[connection === "offline" ? "offline" : pad.status];
  const close = () => dialogRef.current?.close();

  const facts = [
    { icon: "ViewGrid", label: "Raster", value: `${width} × ${height}` },
    pad.game && { icon: "Gamepad", label: "Läuft gerade", value: pad.game },
  ].filter(
    (fact): fact is { icon: string; label: string; value: string } => !!fact,
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // The explorer closes the details on Escape; here it only closes the dialog.
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      style={{ "--status-color": status.color } as CSSProperties}
      className="bg-surface m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden p-0 text-white opacity-100 backdrop:bg-black motion-safe:transition-[opacity,scale,display,overlay] motion-safe:transition-discrete motion-safe:duration-200 motion-safe:starting:open:scale-[0.98] motion-safe:starting:open:opacity-0"
    >
      {/* Soft glow in the status color, so the grid looks lit from below. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--status-color)_14%,transparent),transparent_65%)]"
      />

      <div className="max-w-page relative mx-auto flex h-full flex-col gap-4 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] md:gap-6 md:py-8">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <ConnectionBadge connection={connection} />
            <h2
              id={titleId}
              className="font-pixel truncate text-xl leading-tight md:text-3xl"
            >
              {pad.name}
            </h2>
            <p className="flex items-center gap-1.5 truncate text-sm text-white/60">
              <DynamicIcon name="MapPin" size={16} className="shrink-0" />
              {pad.location}
            </p>
          </div>
          <button
            type="button"
            aria-label="Vollbild schließen"
            onClick={close}
            className="focus-visible:outline-neon-cyan -mr-1 flex size-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 backdrop-blur transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2"
          >
            <DynamicIcon name="Collapse" size={22} />
          </button>
        </header>

        {/* Size container: the grid takes the largest box that fits. */}
        <div className="@container-[size] flex min-h-0 flex-1 items-center justify-center">
          <div
            className="w-full"
            style={{
              maxWidth: `calc((100cqh - ${FRAME_INSET}) * ${width} / ${height} + ${FRAME_INSET})`,
            }}
          >
            <PixelFrame
              color={
                connection === "live" ? status.color : "rgb(255 255 255 / 0.2)"
              }
            >
              <div className="bg-surface p-4">{grid}</div>
            </PixelFrame>
          </div>
        </div>

        <footer className="flex flex-col gap-3">
          <ul className="flex flex-wrap justify-center gap-2">
            <li
              className={`flex items-center gap-1.5 rounded-full border border-current/30 bg-current/10 px-3 py-1.5 text-sm font-semibold ${status.textClass}`}
            >
              <DynamicIcon name={status.icon} size={16} />
              {status.label}
            </li>
            {facts.map((fact) => (
              <li
                key={fact.label}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
              >
                <DynamicIcon
                  name={fact.icon}
                  size={16}
                  className="text-white/50"
                />
                <span className="text-white/50">{fact.label}</span>
                <span className="font-medium">{fact.value}</span>
              </li>
            ))}
          </ul>
          {/* Thumb zone on mobile; the round button above covers desktop. */}
          <Button
            variant="outline"
            tone="neutral"
            icon="Map"
            onClick={close}
            className="md:hidden"
          >
            Zurück zur Karte
          </Button>
        </footer>
      </div>
    </dialog>
  );
}

function ConnectionBadge({ connection }: { connection: LiveConnection }) {
  if (connection === "connecting") {
    return (
      <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-white/50 uppercase">
        <span className="size-2 rounded-full bg-white/40 motion-safe:animate-pulse" />
        Verbinde …
      </p>
    );
  }
  if (connection === "offline") {
    return (
      <p className="text-led-offline flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
        <DynamicIcon name="WifiOff" size={14} />
        Offline · letzter Stand
      </p>
    );
  }
  return (
    <p className="text-neon-green flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
      <span className="relative flex size-2">
        <span className="bg-neon-green absolute inset-0 rounded-full opacity-75 motion-safe:animate-ping" />
        <span className="bg-neon-green shadow-neon-green relative size-2 rounded-full shadow-[0_0_0.5rem]" />
      </span>
      Live
    </p>
  );
}
