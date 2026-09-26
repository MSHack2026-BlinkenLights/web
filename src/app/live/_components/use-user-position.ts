"use client";

import { useState } from "react";

import { type LatLng } from "wbl/utils/geo";

type PositionState =
  | { status: "idle" | "pending" | "denied" | "unavailable" }
  | { status: "granted"; position: LatLng };

/**
 * The visitor's position, requested only on an explicit action and kept in
 * memory: no tracking, nothing is stored or sent to the server.
 */
export function useUserPosition() {
  const [state, setState] = useState<PositionState>({ status: "idle" });

  function request() {
    if (!("geolocation" in navigator)) {
      setState({ status: "unavailable" });
      return;
    }
    setState({ status: "pending" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setState({
          status: "granted",
          position: [coords.latitude, coords.longitude],
        }),
      (error) =>
        setState({
          status:
            error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }),
      { maximumAge: 60_000, timeout: 10_000 },
    );
  }

  return { ...state, request };
}
