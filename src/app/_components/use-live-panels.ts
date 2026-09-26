"use client";

import { useEffect, useState } from "react";

import type { LiveEvent } from "wbl/server/ws/live.js";
import { type PixelColor } from "wbl/types/pad";

export interface LivePanels {
  online: boolean;
  width: number;
  height: number;
  /** Row-major, index = y * width + x; `null` is off or not reported yet. */
  pixels: PixelColor[];
}

/**
 * Follows the panels of a controller live over Server-Sent Events. The
 * browser reconnects on its own and the server then resends the whole grid.
 *
 * @param controllerId - The controller's database ID; `null` follows nothing.
 * @returns The current grid, or `null` until the first event arrived.
 */
export function useLivePanels(controllerId: string | null) {
  const [panels, setPanels] = useState<LivePanels | null>(null);

  useEffect(() => {
    setPanels(null);
    if (!controllerId) return;
    const source = new EventSource(
      `/api/live/${encodeURIComponent(controllerId)}`,
    );
    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as LiveEvent;
      if (event.type === "state") {
        setPanels({
          online: event.online,
          width: event.width,
          height: event.height,
          pixels: event.pixels,
        });
        return;
      }
      if (event.type !== "panel") return;
      setPanels((current) => {
        if (!current || event.x >= current.width || event.y >= current.height)
          return current;
        const pixels = [...current.pixels];
        pixels[event.y * current.width + event.x] = event.color;
        return { ...current, pixels };
      });
    };
    return () => source.close();
  }, [controllerId]);

  return panels;
}
