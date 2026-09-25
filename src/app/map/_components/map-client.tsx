"use client";

import dynamic from "next/dynamic";

const GameMap = dynamic(() => import("./game-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[65vh] min-h-96 w-full items-center justify-center rounded-2xl bg-white/10 text-white/70">
      Loading map…
    </div>
  ),
});

/** Loads Leaflet only in the browser because it depends on DOM APIs. */
export function MapClient() {
  return <GameMap />;
}
