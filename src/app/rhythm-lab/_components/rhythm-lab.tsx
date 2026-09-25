"use client";

import { useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { DEMO_CHART } from "wbl/lib/rhythm/demo-chart";
import {
  COUNT_IN_BEATS,
  GOOD_MS,
  PERFECT_MS,
  renderBoard,
  summarizeRun,
} from "wbl/lib/rhythm/engine";

import { RhythmBoard } from "./rhythm-board";
import { useRhythmSession, type Phase } from "./use-rhythm-session";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Ready",
  preparing: "Preparing audio",
  "count-in": "Count-in",
  playing: "Playing",
  finished: "Finished",
  stopped: "Stopped",
  error: "Audio error",
};

export function RhythmLab() {
  const [alignmentDelayMs, setAlignmentDelayMs] = useState(0);
  const [volume, setVolume] = useState(0.35);
  const session = useRhythmSession(DEMO_CHART);
  const summary = summarizeRun(session.state);
  const pixels = session.active
    ? renderBoard(DEMO_CHART, session.state, session.songMs)
    : Array<string | null>(9).fill(null);
  const latest = session.state.judgments.at(-1);
  const beatMs = 60_000 / DEMO_CHART.bpm;
  const count = Math.min(
    COUNT_IN_BEATS,
    Math.max(1, Math.ceil(-session.songMs / beatMs)),
  );
  const elapsed = Math.max(0, session.songMs);
  const readout = latest
    ? `${latest.kind.toUpperCase()} · ${latest.lane}${latest.errorMs === null ? "" : ` · ${Math.round(Math.abs(latest.errorMs))} ms ${latest.errorMs < 0 ? "early" : "late"}`}`
    : "Your first judgment will appear here.";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(21rem,0.85fr)]">
      <section
        aria-labelledby="board-title"
        className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <h2
            id="board-title"
            className="text-sm font-semibold tracking-wide text-white/70"
          >
            BOARD SIMULATOR
          </h2>
          <span
            role="status"
            className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-sm font-semibold text-cyan-200"
          >
            {PHASE_LABELS[session.phase]}
          </span>
        </div>
        <div className="px-6 py-6 sm:px-10">
          <div className="mb-5 flex min-h-10 items-center justify-between gap-4">
            <p className="text-sm text-white/60">
              {session.phase === "count-in"
                ? "Find the pulse"
                : "Light up. Step in."}
            </p>
            <span
              aria-hidden="true"
              className="font-mono text-3xl font-bold text-cyan-200"
            >
              {session.phase === "count-in" ? count : "♪"}
            </span>
          </div>
          <RhythmBoard
            pixels={pixels}
            held={session.held}
            active={session.active && session.phase !== "preparing"}
            onPress={session.press}
            onRelease={session.lift}
          />
          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/70">
            <span>
              <span aria-hidden="true" className="text-cyan-300">
                ●
              </span>{" "}
              Cyan: get ready
            </span>
            <span>
              <span aria-hidden="true" className="text-white">
                ●
              </span>{" "}
              White: step
            </span>
            <span>
              <span aria-hidden="true" className="text-green-300">
                ●
              </span>{" "}
              Green: hit
            </span>
            <span>
              <span aria-hidden="true" className="text-red-300">
                ●
              </span>{" "}
              Red: miss
            </span>
          </div>
          <p className="mt-5 text-center text-sm leading-relaxed text-white/60">
            Use the arrow keys or press the panels. Release between steps. No
            scrolling notes: all gameplay cues come from the board.
          </p>
        </div>
      </section>

      <div className="space-y-5">
        <section
          aria-labelledby="track-title"
          className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
        >
          <p className="text-xs font-semibold tracking-widest text-cyan-200 uppercase">
            Generated audio · No hardware connected
          </p>
          <h2 id="track-title" className="mt-3 text-2xl font-bold">
            {DEMO_CHART.title}
          </h2>
          <p className="mt-1 text-sm text-white/60">
            120 BPM · 16 isolated steps · 20 seconds including count-in
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              disabled={session.active}
              onClick={() => void session.start(alignmentDelayMs, volume)}
            >
              {session.phase === "idle" || session.phase === "error"
                ? "Start demo"
                : "Restart demo"}
            </Button>
            <Button
              variant="outline"
              tone="neutral"
              disabled={!session.active}
              onClick={() => session.stop()}
            >
              Stop
            </Button>
          </div>
          <p
            role={session.phase === "error" ? "alert" : undefined}
            className="mt-4 min-h-10 text-sm text-white/70"
          >
            {session.message}
          </p>
          <progress
            aria-label="Song progress"
            value={elapsed}
            max={DEMO_CHART.durationMs}
            className="mt-3 h-1.5 w-full accent-cyan-300"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-white/50">
            <span data-song-ms={Math.round(session.songMs)}>
              {(elapsed / 1000).toFixed(1)}s
            </span>
            <span>{DEMO_CHART.durationMs / 1000}s + four-beat count-in</span>
          </div>
        </section>

        <section
          aria-labelledby="timing-title"
          className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
        >
          <h2 id="timing-title" className="font-semibold">
            Output calibration
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Start with built-in or wired audio. If sound arrives after the
            lights, increase the delay. Bluetooth delay varies by device.
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <label htmlFor="alignment-delay">LED + scoring delay</label>
            <span className="font-mono text-cyan-200">
              {alignmentDelayMs > 0 ? "+" : ""}
              {alignmentDelayMs} ms
            </span>
          </div>
          <input
            id="alignment-delay"
            type="range"
            min={-250}
            max={500}
            step={10}
            value={alignmentDelayMs}
            disabled={session.active}
            aria-valuetext={`${alignmentDelayMs} milliseconds`}
            onChange={(event) =>
              setAlignmentDelayMs(Number(event.target.value))
            }
            className="mt-3 w-full accent-cyan-300 disabled:opacity-40"
          />
          <p className="mt-1 text-xs text-white/50">
            Positive values delay the board and judging together, not the audio.
            Stop the run to adjust.
          </p>
          <div className="mt-5 flex justify-between text-sm">
            <label htmlFor="rhythm-volume">Volume</label>
            <span className="text-white/60">{Math.round(volume * 100)}%</span>
          </div>
          <input
            id="rhythm-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            disabled={session.active}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="mt-3 w-full accent-cyan-300 disabled:opacity-40"
          />
        </section>

        <section
          aria-labelledby="readout-title"
          className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 id="readout-title" className="font-semibold">
              Developer readout
            </h2>
            <span className="font-mono text-xl text-cyan-200">
              <span className="sr-only">Score: </span>
              {summary.score.toLocaleString()} pts
            </span>
          </div>
          <p
            role="status"
            className="mt-4 min-h-5 font-mono text-sm text-white/80"
          >
            {readout}
          </p>
          <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
            {(
              [
                ["Perfect", summary.perfect],
                ["Good", summary.good],
                ["Miss", summary.miss],
                ["Stray", summary.strayPresses],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/5 px-2 py-3">
                <dt className="text-xs text-white/60">{label}</dt>
                <dd
                  className="mt-1 font-mono text-xl"
                  data-stat={label.toLowerCase()}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-white/50">
            Perfect: ±{PERFECT_MS} ms · Good: ±{GOOD_MS} ms. Stray presses do
            not score. Holding a key never repeats a step.
          </p>
        </section>
      </div>
    </div>
  );
}
