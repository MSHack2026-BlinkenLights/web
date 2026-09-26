import { type Metadata } from "next";
import { Suspense } from "react";

import { PageShell } from "wbl/app/_components/ui/page-shell";
import { getSession } from "wbl/server/better-auth/server";
import { api, HydrateClient } from "wbl/trpc/server";

import { ClaimFlow, ClaimFlowSkeleton } from "./_components/ClaimFlow";

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
  const { pad } = await searchParams;

  return (
    <PageShell
      width="medium"
      title="Spiel sichern"
      description="Gerade gespielt? Beweis, dass du am Spielfeld stehst, und nimm deine Runde mit."
    >
      <Suspense fallback={<ClaimFlowSkeleton />}>
        <Claim padId={pad} />
      </Suspense>
    </PageShell>
  );
}

async function Claim({ padId }: { padId?: string }) {
  const [session] = await Promise.all([
    getSession(),
    api.claim.pads.prefetch(),
  ]);

  return (
    <HydrateClient>
      <ClaimFlow initialPadId={padId} signedIn={!!session} />
    </HydrateClient>
  );
}
