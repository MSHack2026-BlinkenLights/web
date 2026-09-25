import { type Metadata } from "next";
import Link from "next/link";

import { RhythmLab } from "./_components/rhythm-lab";

export const metadata: Metadata = {
  title: "Rhythm Lab | Blinken Lights",
  description: "An audio-synchronized LED rhythm game prototype",
};

export default function RhythmLabPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-cyan-200 uppercase">
            Blinken Lights / Experimental
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Find your rhythm.
          </h1>
          <p className="mt-3 max-w-2xl text-white/60">
            One audio clock. Four directions. Follow the lights and land on the
            beat.
          </p>
        </div>
        <Link
          href="/map"
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          Back to map
        </Link>
      </header>
      <RhythmLab />
      <p className="mt-6 max-w-4xl text-xs leading-relaxed text-white/50">
        Prototype only: generated music, simulated board, and browser input. No
        data is sent to a controller or saved. Start at a comfortable volume;
        the board uses changing brightness and brief light pulses. Press Escape
        to stop. Switching tabs, losing window focus, or an audio interruption
        stops the run. Hardware timing and Bluetooth synchronization are not yet
        guaranteed.
      </p>
    </main>
  );
}
