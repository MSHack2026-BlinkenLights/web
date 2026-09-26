import { type Metadata } from "next";
import { Suspense } from "react";

import { PageShell } from "wbl/app/_components/ui/page-shell";
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

  return (
    <HydrateClient>
      <PageShell
        fill
        title="Live-Karte"
        description="Hier siehst du alle Spielfelder in Münster und ob gerade gespielt wird. Tipp auf einen Pin für Details und Route."
      >
        <Suspense fallback={<MapLoading />}>
          <MapClient />
        </Suspense>
      </PageShell>
    </HydrateClient>
  );
}
