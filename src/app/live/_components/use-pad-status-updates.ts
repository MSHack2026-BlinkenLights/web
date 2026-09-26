"use client";

import { useEffect } from "react";

import { api } from "wbl/trpc/react";

/** Coalesces bursts, e.g. a `hello` that also aborts a game. */
const DEBOUNCE_MS = 300;

/**
 * Reloads the pads as soon as a controller connects, disconnects, or a game
 * on it starts or ends, so status and map pins follow the pads live. Free
 * seats still come with the query's regular polling.
 */
export function usePadStatusUpdates() {
  const utils = api.useUtils();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource("/api/live/status");
    source.onmessage = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void utils.live.pads.invalidate(), DEBOUNCE_MS);
    };
    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, [utils]);
}
