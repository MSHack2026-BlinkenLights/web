import { type Metadata } from "next";
import Link from "next/link";

import { MapClient } from "./_components/map-client";

export const metadata: Metadata = {
  title: "Game map | Blinken Lights",
  description: "Game locations around Münster",
};

export default function MapPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-widest text-purple-300 uppercase">
              Blinken Lights
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              Games in Münster
            </h1>
            <p className="mt-2 max-w-2xl text-white/70">
              A first map scaffold using hardcoded game locations. Select a
              marker to see the game and venue.
            </p>
          </div>
          <Link
            href="/"
            className="w-fit rounded-full bg-white/10 px-5 py-2 font-semibold transition hover:bg-white/20"
          >
            Back home
          </Link>
        </header>

        <section
          aria-label="Map of game locations in Münster"
          className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-2 shadow-2xl"
        >
          <MapClient />
        </section>
      </div>
    </main>
  );
}
