import { type Metadata } from "next";

import { PlayRequestBoard } from "wbl/app/looking-to-play/_components/PlayRequestBoard";
import { api, HydrateClient } from "wbl/trpc/server";

export const metadata: Metadata = {
  title: "Mitspielen",
  description:
    "Finde Leute, die gerade oder bald an einem Blinkin-Lights-Spielfeld in Münster spielen wollen.",
};

export default async function LookingToPlayPage() {
  // Awaited so the board renders with data on the server, not a loading state.
  await Promise.all([
    api.lookingToPlay.list.prefetch({}),
    api.lookingToPlay.options.prefetch(),
  ]);

  return (
    <HydrateClient>
      <main className="bg-surface mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-6 pb-28 text-white md:pb-12">
        <header>
          <h1 className="text-2xl font-bold">Mitspielen</h1>
          <p className="mt-1 text-sm text-white/60">
            Hier siehst du, wer gerade oder bald an einem Spielfeld spielen
            will. Schließ dich an oder biete selbst eine Runde an.
          </p>
        </header>

        <PlayRequestBoard />
      </main>
    </HydrateClient>
  );
}
