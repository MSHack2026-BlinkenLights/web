import { type PadStatus } from "wbl/server/services/pad-overview";
import { type RouterOutputs } from "wbl/trpc/react";

export type { PadStatus };
export type Pad = RouterOutputs["live"]["pads"]["pads"][number];
export type PadPlayRequest = Pad["playRequests"][number];

export const MUENSTER_CENTER: [number, number] = [51.9607, 7.6261];

/** Label, Iconoir icon and color token per status. Status is never shown by color alone. */
export const PAD_STATUS: Record<
  PadStatus,
  { label: string; icon: string; color: string; textClass: string }
> = {
  free: {
    label: "Frei",
    icon: "CheckCircle",
    color: "var(--color-neon-green)",
    textClass: "text-neon-green",
  },
  playing: {
    label: "Wird bespielt",
    icon: "Gamepad",
    color: "var(--color-neon-yellow)",
    textClass: "text-neon-yellow",
  },
  offline: {
    label: "Offline / Wartung",
    icon: "WifiOff",
    color: "var(--color-led-offline)",
    textClass: "text-led-offline",
  },
};
