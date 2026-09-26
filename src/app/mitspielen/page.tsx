import { type Metadata } from "next";

import { PlayRequestBoard } from "wbl/app/mitspielen/_components/PlayRequestBoard";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { api, HydrateClient } from "wbl/trpc/server";

export const metadata: Metadata = {
  title: "Mitspielen",
  description:
    "Finde Leute, die gerade oder bald an einem Blinkin-Lights-Spielfeld in Münster spielen wollen.",
};

// Live data per request. Without this, the build prerenders the page statically:
// `prefetch` swallows the dynamic `headers()` bailout, and the client hooks then
// try to fetch over HTTP while no server is running.
export const dynamic = "force-dynamic";

export default async function LookingToPlayPage() {
  // Awaited so the board renders with data on the server, not a loading state.
  await Promise.all([
    api.lookingToPlay.list.prefetch({}),
    api.lookingToPlay.options.prefetch(),
  ]);

  return (
    <HydrateClient>
      <PageShell
        floatingAction
        title="Mitspielen"
        description="Hier siehst du, wer gerade oder bald an einem Spielfeld spielen will. Schließ dich an oder biete selbst eine Runde an."
      >
        <PlayRequestBoard />
      </PageShell>
    </HydrateClient>
  );
}
