import { type Metadata } from "next";
import { Suspense } from "react";

import { api, HydrateClient } from "wbl/trpc/server";

import { MapClient, MapLoading } from "./_components/map-client";

export const metadata: Metadata = {
  title: "Live-Karte",
  description:
    "Alle Blinkin-Lights-Spielfelder in Münster auf einer Karte – mit Status, ob gerade frei oder bespielt.",
};

// Live data per request, see the note in mitspielen/page.tsx.
export const dynamic = "force-dynamic";

export default async function LivePage() {
  await api.live.pads.prefetch();

  // <main> fills the viewport between the sticky Header (3.5rem + border) and
  // the mobile BottomBar, whose space the body already reserves as padding.
  return (
    <HydrateClient>
      <main className="bg-surface mx-auto flex h-[calc(100dvh-3.5rem-1px-env(safe-area-inset-top)-4rem-env(safe-area-inset-bottom))] min-h-[32rem] w-full max-w-md flex-col gap-4 px-4 pt-6 pb-4 text-white md:h-[calc(100dvh-3.5rem-1px-env(safe-area-inset-top))] md:max-w-5xl md:px-6">
        <header>
          <h1 className="text-2xl font-bold">Live-Karte</h1>
          <p className="mt-1 text-sm text-white/60">
            Hier siehst du alle Spielfelder in Münster und ob gerade gespielt
            wird. Tipp auf einen Pin für Details und Route.
          </p>
        </header>

        <Suspense fallback={<MapLoading />}>
          <MapClient />
        </Suspense>
      </main>
    </HydrateClient>
  );
}
