"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import {
  generateChartFromAnalysis,
  type TempoMultiplier,
} from "wbl/lib/rhythm/chart-generator";
import { DEMO_CHART } from "wbl/lib/rhythm/demo-chart";
import {
  COUNT_IN_BEATS,
  GOOD_MS,
  PERFECT_MS,
  renderBoard,
  summarizeRun,
} from "wbl/lib/rhythm/engine";
import type { JamendoCatalogTrack } from "wbl/lib/rhythm/jamendo";
import {
  prepareJamendoTrack,
  searchJamendo,
} from "wbl/lib/rhythm/jamendo-source";
import { prepareLocalTrack } from "wbl/lib/rhythm/local-source";
import type {
  PreparationProgress,
  PreparedAudioTrack,
  TrackAttribution,
} from "wbl/lib/rhythm/source";

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

const GENERATED_ATTRIBUTION: TrackAttribution = {
  creator: "Blinken Lights team",
  provider: "Built-in generator",
  licenseName: "Original generated audio",
  notice: "Generated in this browser; no external music service is used.",
};

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export interface RhythmLabProps {
  jamendoConfigured?: boolean;
}

export function RhythmLab({ jamendoConfigured = false }: RhythmLabProps) {
  const [preparedTrack, setPreparedTrack] = useState<PreparedAudioTrack | null>(
    null,
  );
  const [alignmentDelayMs, setAlignmentDelayMs] = useState(0);
  const [volume, setVolume] = useState(0.35);
  const [tempoMultiplier, setTempoMultiplier] = useState<TempoMultiplier>(1);
  const [chartOffsetMs, setChartOffsetMs] = useState(0);
  const [progress, setProgress] = useState<PreparationProgress | null>(null);
  const [sourceError, setSourceError] = useState("");
  const [jamendoQuery, setJamendoQuery] = useState("");
  const [jamendoResults, setJamendoResults] = useState<JamendoCatalogTrack[]>(
    [],
  );
  const [searchingJamendo, setSearchingJamendo] = useState(false);
  const searchRequest = useRef<AbortController | null>(null);
  const preparation = useRef<AbortController | null>(null);

  const chart = useMemo(
    () =>
      preparedTrack
        ? generateChartFromAnalysis(preparedTrack.analysis, {
            identity: preparedTrack.metadata.identity,
            title: preparedTrack.metadata.title,
            durationMs: preparedTrack.metadata.durationMs,
            tempoMultiplier,
            chartOffsetMs,
          })
        : DEMO_CHART,
    [chartOffsetMs, preparedTrack, tempoMultiplier],
  );
  const session = useRhythmSession(chart);
  const summary = summarizeRun(session.state);
  const pixels = session.active
    ? renderBoard(chart, session.state, session.songMs)
    : Array<string | null>(9).fill(null);
  const latest = session.state.judgments.at(-1);
  const beatMs = 60_000 / chart.bpm;
  const count = Math.min(
    COUNT_IN_BEATS,
    Math.max(1, Math.ceil(-session.songMs / beatMs)),
  );
  const elapsed = Math.max(0, session.songMs);
  const readout = latest
    ? `${latest.kind.toUpperCase()} · ${latest.lane}${latest.errorMs === null ? "" : ` · ${Math.round(Math.abs(latest.errorMs))} ms ${latest.errorMs < 0 ? "early" : "late"}`}`
    : "Your first judgment will appear here.";
  const attribution =
    preparedTrack?.metadata.attribution ?? GENERATED_ATTRIBUTION;
  const loading = progress !== null;

  useEffect(
    () => () => {
      preparation.current?.abort();
      searchRequest.current?.abort();
    },
    [],
  );

  function useGeneratedDemo() {
    preparation.current?.abort();
    preparation.current = null;
    if (session.active) session.stop("Source changed. Start a fresh run.");
    setPreparedTrack(null);
    setProgress(null);
    setSourceError("");
    setTempoMultiplier(1);
    setChartOffsetMs(0);
  }

  async function chooseLocalFile(file: File) {
    preparation.current?.abort();
    if (session.active) session.stop("Source changed. Start a fresh run.");
    const controller = new AbortController();
    preparation.current = controller;
    setSourceError("");
    setProgress({
      stage: "fetching",
      fraction: 0,
      message: "Reading local audio…",
    });
    try {
      const track = await prepareLocalTrack(
        file,
        controller.signal,
        (nextProgress) => {
          if (preparation.current === controller) setProgress(nextProgress);
        },
      );
      if (preparation.current !== controller) return;
      setPreparedTrack(track);
      setTempoMultiplier(1);
      setChartOffsetMs(0);
    } catch (error) {
      if (controller.signal.aborted) return;
      setSourceError(
        error instanceof Error ? error.message : "Could not prepare that file.",
      );
    } finally {
      if (preparation.current === controller) {
        preparation.current = null;
        setProgress(null);
      }
    }
  }

  async function runJamendoSearch() {
    const query = jamendoQuery.trim();
    if (query.length < 2) {
      setSourceError("Enter at least two search characters.");
      return;
    }
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSourceError("");
    setSearchingJamendo(true);
    try {
      const tracks = await searchJamendo(query, controller.signal);
      if (searchRequest.current === controller) setJamendoResults(tracks);
    } catch (error) {
      if (!controller.signal.aborted)
        setSourceError(
          error instanceof Error ? error.message : "Jamendo search failed.",
        );
    } finally {
      if (searchRequest.current === controller) {
        searchRequest.current = null;
        setSearchingJamendo(false);
      }
    }
  }

  async function chooseJamendoTrack(track: JamendoCatalogTrack) {
    preparation.current?.abort();
    if (session.active) session.stop("Source changed. Start a fresh run.");
    const controller = new AbortController();
    preparation.current = controller;
    setSourceError("");
    setProgress({
      stage: "fetching",
      fraction: 0,
      message: "Loading Jamendo audio…",
    });
    try {
      const prepared = await prepareJamendoTrack(
        track,
        controller.signal,
        (nextProgress) => {
          if (preparation.current === controller) setProgress(nextProgress);
        },
      );
      if (preparation.current !== controller) return;
      setPreparedTrack(prepared);
      setTempoMultiplier(1);
      setChartOffsetMs(0);
    } catch (error) {
      if (!controller.signal.aborted)
        setSourceError(
          error instanceof Error
            ? error.message
            : "Could not prepare that Jamendo track.",
        );
    } finally {
      if (preparation.current === controller) {
        preparation.current = null;
        setProgress(null);
      }
    }
  }

  function adjustChartOffset(delta: number) {
    if (session.active) return;
    setChartOffsetMs((value) => Math.max(-2000, Math.min(2000, value + delta)));
  }

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
          aria-labelledby="source-title"
          className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
        >
          <h2 id="source-title" className="font-semibold">
            Audio source
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            The built-in demo works offline. A local file is decoded completely
            in memory, analyzed in a worker, and never uploaded.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant={preparedTrack ? "outline" : undefined}
              tone={preparedTrack ? "neutral" : undefined}
              disabled={session.active}
              onClick={useGeneratedDemo}
            >
              Generated demo
            </Button>
            <label
              className={`inline-flex cursor-pointer items-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold hover:bg-white/10 ${session.active ? "pointer-events-none opacity-40" : ""}`}
            >
              Choose local audio
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
                className="sr-only"
                disabled={session.active}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void chooseLocalFile(file);
                }}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-white/50">
            Local limits: 20 MB and 5 minutes. You are responsible for playback
            and synchronization rights.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold">Jamendo catalog</p>
            {jamendoConfigured ? (
              <>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  Search results are restricted to explicit CC BY licenses. The
                  selected track is fetched once into memory for this session.
                </p>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runJamendoSearch();
                  }}
                >
                  <label htmlFor="jamendo-search" className="sr-only">
                    Search Jamendo
                  </label>
                  <input
                    id="jamendo-search"
                    type="search"
                    minLength={2}
                    maxLength={80}
                    value={jamendoQuery}
                    disabled={session.active || loading || searchingJamendo}
                    placeholder="Artist, track, or genre"
                    onChange={(event) => setJamendoQuery(event.target.value)}
                    className="min-w-0 flex-1 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm outline-none focus:border-cyan-300 disabled:opacity-40"
                  />
                  <button
                    type="submit"
                    disabled={session.active || loading || searchingJamendo}
                    className="rounded-full border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-40"
                  >
                    {searchingJamendo ? "Searching…" : "Search"}
                  </button>
                </form>
                {jamendoResults.length > 0 ? (
                  <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {jamendoResults.map((track) => (
                      <li
                        key={track.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {track.title}
                          </p>
                          <p className="truncate text-xs text-white/50">
                            {track.artist} · {formatDuration(track.durationMs)}{" "}
                            ·{" "}
                            <a
                              href={track.trackUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              Jamendo
                            </a>{" "}
                            ·{" "}
                            <a
                              href={track.licenseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {track.licenseName}
                            </a>
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={loading || session.active}
                          onClick={() => void chooseJamendoTrack(track)}
                          className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold disabled:opacity-40"
                        >
                          Use
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Unavailable: set the server-only JAMENDO_CLIENT_ID to enable CC
                BY catalog search.
              </p>
            )}
          </div>
          {progress ? (
            <div className="mt-4" role="status">
              <p className="text-sm text-cyan-100">{progress.message}</p>
              <progress
                aria-label="Audio preparation progress"
                className="mt-2 h-1.5 w-full accent-cyan-300"
                value={progress.fraction}
                max={1}
              />
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-white/70 underline"
                onClick={() => preparation.current?.abort()}
              >
                Cancel preparation
              </button>
            </div>
          ) : null}
          {sourceError ? (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {sourceError}
            </p>
          ) : null}
        </section>

        <section
          aria-labelledby="track-title"
          className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
        >
          <p className="text-xs font-semibold tracking-widest text-cyan-200 uppercase">
            {preparedTrack
              ? `${preparedTrack.metadata.artist} · Decoded audio`
              : "Generated audio · No hardware connected"}
          </p>
          <h2 id="track-title" className="mt-3 text-2xl font-bold">
            {chart.title}
          </h2>
          <p className="mt-1 text-sm text-white/60">
            {chart.bpm} BPM · {chart.notes.length} isolated steps ·{" "}
            {formatDuration(chart.durationMs)} plus count-in
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              disabled={session.active || loading || chart.notes.length === 0}
              onClick={() =>
                void session.start(
                  alignmentDelayMs,
                  volume,
                  preparedTrack?.buffer,
                )
              }
            >
              {session.phase === "idle" || session.phase === "error"
                ? preparedTrack
                  ? "Start track"
                  : "Start demo"
                : preparedTrack
                  ? "Restart track"
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
            {chart.notes.length === 0
              ? "No safely spaced notes fit this chart. Adjust tempo interpretation or offset."
              : session.message}
          </p>
          <progress
            aria-label="Song progress"
            value={elapsed}
            max={chart.durationMs}
            className="mt-3 h-1.5 w-full accent-cyan-300"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-white/50">
            <span data-song-ms={Math.round(session.songMs)}>
              {(elapsed / 1000).toFixed(1)}s
            </span>
            <span>{formatDuration(chart.durationMs)} + four-beat count-in</span>
          </div>
          <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/60">
            <p>
              <span className="font-semibold text-white/80">
                {attribution.creator}
              </span>{" "}
              · {attribution.provider}
            </p>
            <p className="mt-1">
              {attribution.trackUrl ? (
                <a
                  className="underline"
                  href={attribution.trackUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Track page
                </a>
              ) : null}
              {attribution.trackUrl ? " · " : null}
              {attribution.licenseUrl ? (
                <a
                  className="underline"
                  href={attribution.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {attribution.licenseName}
                </a>
              ) : (
                attribution.licenseName
              )}
            </p>
            {attribution.notice ? (
              <p className="mt-2 text-white/45">{attribution.notice}</p>
            ) : null}
          </div>
        </section>

        {preparedTrack ? (
          <section
            aria-labelledby="analysis-title"
            className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
          >
            <h2 id="analysis-title" className="font-semibold">
              Analysis and chart correction
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Simple energy-grid fallback · confidence{" "}
              {Math.round(preparedTrack.analysis.confidence * 100)}%. It can
              choose half/double tempo or the wrong phase; this is not Essentia
              analysis.
            </p>
            <div className="mt-4">
              <span className="text-sm">Tempo interpretation</span>
              <div className="mt-2 flex gap-2">
                {([0.5, 1, 2] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={session.active}
                    aria-pressed={tempoMultiplier === value}
                    onClick={() => setTempoMultiplier(value)}
                    className="rounded-full border border-white/20 px-4 py-1.5 text-sm disabled:opacity-40 aria-pressed:border-cyan-300 aria-pressed:bg-cyan-300/15"
                  >
                    {value}×
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span>Chart offset</span>
              <span className="font-mono text-cyan-200">
                {chartOffsetMs > 0 ? "+" : ""}
                {chartOffsetMs} ms
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[-50, -10, 10, 50].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  disabled={session.active}
                  onClick={() => adjustChartOffset(delta)}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs disabled:opacity-40"
                >
                  {delta > 0 ? "+" : ""}
                  {delta} ms
                </button>
              ))}
              <button
                type="button"
                disabled={session.active || chartOffsetMs === 0}
                onClick={() => setChartOffsetMs(0)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs disabled:opacity-40"
              >
                Reset
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              Chart preview:{" "}
              {chart.notes
                .slice(0, 6)
                .map(
                  (note) => `${(note.hitAtMs / 1000).toFixed(2)}s ${note.lane}`,
                )
                .join(" · ") || "no targets"}
              . Corrections move targets only; they never change playback speed
              or output calibration.
            </p>
          </section>
        ) : null}

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
