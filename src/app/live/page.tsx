import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MapClient } from "./_components/map-client";

export const metadata: Metadata = {
  title: "Game map | Blinken Lights",
  description: "Game locations around Münster",
};

export default function LivePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] px-4 py-10 text-white">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-widest text-purple-300 uppercase">
              Blinken Lights
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              Games in Münster
            </h1>
            <p className="mt-2 max-w-2xl text-white/70">
              Explore demo locations and watch a simulated LED preview. Select a
              marker or a location below to open its details.
            </p>
          </div>
          <Link
            href="/"
            className="w-fit rounded-full bg-white/10 px-5 py-2 font-semibold transition hover:bg-white/20"
          >
            Back home
          </Link>
        </header>

        <Suspense
          fallback={
            <div
              role="status"
              className="flex min-h-96 items-center justify-center rounded-2xl bg-white/10 text-white/70"
            >
              Loading map…
            </div>
          }
        >
          <MapClient />
        </Suspense>
      </div>
    </main>
  );
}
