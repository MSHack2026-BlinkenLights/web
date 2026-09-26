import { type Metadata } from "next";
import { Suspense } from "react";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { getSession } from "wbl/server/better-auth/server";
import { api, HydrateClient } from "wbl/trpc/server";

import { ClaimFlow } from "./_components/ClaimFlow";

export const metadata: Metadata = {
  title: "Spiel sichern",
  description:
    "Sichere deine letzte Runde an einem Blinkin-Lights-Spielfeld, um sie anzusehen und herunterzuladen.",
  robots: { index: false, follow: false },
};

// Pad state changes by the second, see the note in mitspielen/page.tsx.
export const dynamic = "force-dynamic";

export default async function ClaimPage({
  searchParams,
}: {
  /** `pad` comes from the QR code at the pad. */
  searchParams: Promise<{ pad?: string }>;
}) {
  const [{ pad }, session] = await Promise.all([
    searchParams,
    getSession(),
    api.claim.pads.prefetch(),
  ]);

  return (
    <HydrateClient>
      <PageShell
        width="medium"
        title="Spiel sichern"
        description="Gerade gespielt? Beweis, dass du am Spielfeld stehst, und nimm deine Runde mit."
      >
        <Suspense
          fallback={
            <div className="mx-auto w-40">
              <PixelGrid width={3} height={3} pending label="Lädt …" />
            </div>
          }
        >
          <ClaimFlow initialPadId={pad} signedIn={!!session} />
        </Suspense>
      </PageShell>
    </HydrateClient>
  );
}
