"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button, buttonClasses } from "wbl/app/_components/ui/button";
import { TextField } from "wbl/app/_components/ui/text-field";
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

import { LANE_LABELS, RhythmBoard } from "./rhythm-board";
import { useRhythmSession, type Phase } from "./use-rhythm-session";

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Bereit",
  preparing: "Audio lädt",
  "count-in": "Einzählen",
  playing: "Läuft",
  finished: "Geschafft",
  stopped: "Gestoppt",
  error: "Audiofehler",
};

const JUDGMENT_LABELS = {
  perfect: "Perfekt",
  good: "Gut",
  miss: "Verpasst",
} as const;

const card = "rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:p-6";

/** Small toggle or step button, still 48px high for touch. */
const chip =
  "min-h-12 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-neon-cyan disabled:opacity-40 disabled:hover:bg-transparent aria-pressed:border-neon-cyan/60 aria-pressed:bg-neon-cyan/10 aria-pressed:text-neon-cyan";

const GENERATED_ATTRIBUTION: TrackAttribution = {
  creator: "Blinkin-Lights-Team",
  provider: "Eingebauter Generator",
  licenseName: "Eigens erzeugte Musik",
  notice: "Im Browser erzeugt – es wird kein externer Musikdienst genutzt.",
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
    ? `${JUDGMENT_LABELS[latest.kind]} · ${LANE_LABELS[latest.lane]}${latest.errorMs === null ? "" : ` · ${Math.round(Math.abs(latest.errorMs))} ms zu ${latest.errorMs < 0 ? "früh" : "spät"}`}`
    : "Hier erscheint deine erste Wertung.";
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
    if (session.active)
      session.stop("Quelle gewechselt. Starte eine neue Runde.");
    setPreparedTrack(null);
    setProgress(null);
    setSourceError("");
    setTempoMultiplier(1);
    setChartOffsetMs(0);
  }

  async function chooseLocalFile(file: File) {
    preparation.current?.abort();
    if (session.active)
      session.stop("Quelle gewechselt. Starte eine neue Runde.");
    const controller = new AbortController();
    preparation.current = controller;
    setSourceError("");
    setProgress({
      stage: "fetching",
      fraction: 0,
      message: "Lokale Audiodatei wird gelesen …",
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
        error instanceof Error
          ? error.message
          : "Die Datei konnte nicht vorbereitet werden.",
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
      setSourceError("Gib mindestens zwei Zeichen ein.");
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
          error instanceof Error
            ? error.message
            : "Die Jamendo-Suche ist fehlgeschlagen.",
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
    if (session.active)
      session.stop("Quelle gewechselt. Starte eine neue Runde.");
    const controller = new AbortController();
    preparation.current = controller;
    setSourceError("");
    setProgress({
      stage: "fetching",
      fraction: 0,
      message: "Jamendo-Track wird geladen …",
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
            : "Der Jamendo-Track konnte nicht vorbereitet werden.",
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
    <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <section
        aria-labelledby="board-title"
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] md:sticky md:top-[calc(var(--header-h)+1.5rem)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
          <h2 id="board-title" className="text-sm text-white/70">
            Spielfeld-Simulator
          </h2>
          <span
            role="status"
            className="border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan rounded-full border px-3 py-1 text-sm font-semibold"
          >
            {PHASE_LABELS[session.phase]}
          </span>
        </div>
        <div className="px-5 py-6 md:px-8">
          <div className="mb-5 flex min-h-10 items-center justify-between gap-4">
            <p className="text-sm text-white/60">
              {session.phase === "count-in"
                ? "Spür den Takt"
                : "Es leuchtet – du trittst."}
            </p>
            <span
              aria-hidden="true"
              className="font-pixel text-neon-cyan text-3xl"
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
          <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/70">
            {(
              [
                ["text-neon-cyan", "Cyan: gleich geht's los"],
                ["text-white", "Weiß: jetzt treten"],
                ["text-neon-green", "Grün: getroffen"],
                ["text-led-miss", "Rot: verpasst"],
              ] as const
            ).map(([color, label]) => (
              <li key={label}>
                <span aria-hidden="true" className={color}>
                  ●
                </span>{" "}
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-center text-sm leading-relaxed text-white/60">
            Nutze die Pfeiltasten oder tippe auf die Felder. Lass zwischen den
            Schritten los. Keine fallenden Noten: Alle Hinweise kommen vom
            Spielfeld.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-5">
        <section aria-labelledby="track-title" className={card}>
          <p className="text-neon-cyan text-xs font-semibold tracking-widest uppercase">
            {preparedTrack
              ? `${preparedTrack.metadata.artist} · Dekodierte Musik`
              : "Erzeugte Musik · Keine Hardware verbunden"}
          </p>
          <h2 id="track-title" className="mt-3 text-xl md:text-2xl">
            {chart.title}
          </h2>
          <p className="mt-1 text-sm text-white/60">
            {chart.bpm} BPM · {chart.notes.length} einzelne Schritte ·{" "}
            {formatDuration(chart.durationMs)} plus Einzählen
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              icon="Play"
              className="flex-1"
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
                  ? "Track starten"
                  : "Demo starten"
                : preparedTrack
                  ? "Track neu starten"
                  : "Demo neu starten"}
            </Button>
            <Button
              variant="outline"
              tone="neutral"
              icon="Square"
              disabled={!session.active}
              onClick={() => session.stop()}
            >
              Stopp
            </Button>
          </div>
          <p
            role={session.phase === "error" ? "alert" : undefined}
            className="mt-4 min-h-10 text-sm text-white/70"
          >
            {chart.notes.length === 0
              ? "Für diesen Track passen keine sicher verteilten Schritte. Passe Tempo oder Versatz an."
              : session.message}
          </p>
          <progress
            aria-label="Fortschritt des Songs"
            value={elapsed}
            max={chart.durationMs}
            className="accent-neon-cyan mt-3 h-1.5 w-full"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-white/50">
            <span data-song-ms={Math.round(session.songMs)}>
              {(elapsed / 1000).toFixed(1).replace(".", ",")} s
            </span>
            <span>{formatDuration(chart.durationMs)} + 4 Takte Einzählen</span>
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
                  className="underline hover:text-white"
                  href={attribution.trackUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Zum Track
                </a>
              ) : null}
              {attribution.trackUrl ? " · " : null}
              {attribution.licenseUrl ? (
                <a
                  className="underline hover:text-white"
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

        <section aria-labelledby="source-title" className={card}>
          <h2 id="source-title" className="text-lg">
            Musikquelle
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Die eingebaute Demo funktioniert offline. Eine eigene Datei wird
            komplett im Browser dekodiert und analysiert – sie wird nie
            hochgeladen.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant={preparedTrack ? "outline" : "solid"}
              tone={preparedTrack ? "neutral" : "cyan"}
              className="flex-1 px-5 text-sm"
              disabled={session.active}
              onClick={useGeneratedDemo}
            >
              Erzeugte Demo
            </Button>
            <label
              className={`${buttonClasses("outline", "neutral")} flex-1 cursor-pointer px-5 text-sm has-focus-visible:outline-2 ${session.active ? "pointer-events-none opacity-40" : ""}`}
            >
              Eigene Musik wählen
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
            Maximal 20 MB und 5 Minuten. Du bist selbst dafür verantwortlich,
            die Musik abspielen zu dürfen.
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold">Jamendo-Katalog</p>
            {jamendoConfigured ? (
              <>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  Es werden nur Tracks mit ausdrücklicher CC-BY-Lizenz
                  angezeigt. Der gewählte Track wird für diese Sitzung einmal in
                  den Speicher geladen.
                </p>
                <form
                  role="search"
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runJamendoSearch();
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <TextField
                      id="jamendo-search"
                      type="search"
                      label="Jamendo durchsuchen"
                      placeholder="Künstler:in, Titel oder Genre"
                      minLength={2}
                      maxLength={80}
                      value={jamendoQuery}
                      disabled={session.active || loading || searchingJamendo}
                      onChange={(event) => setJamendoQuery(event.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    icon="Search"
                    className="shrink-0 px-4 text-sm"
                    disabled={session.active || loading || searchingJamendo}
                  >
                    <span className="sr-only md:not-sr-only">
                      {searchingJamendo ? "Sucht …" : "Suchen"}
                    </span>
                  </Button>
                </form>
                {jamendoResults.length > 0 ? (
                  <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
                    {jamendoResults.map((track) => (
                      <li
                        key={track.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"
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
                              className="underline hover:text-white"
                            >
                              Jamendo
                            </a>{" "}
                            ·{" "}
                            <a
                              href={track.licenseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline hover:text-white"
                            >
                              {track.licenseName}
                            </a>
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`${track.title} verwenden`}
                          disabled={loading || session.active}
                          onClick={() => void chooseJamendoTrack(track)}
                          className={`${chip} shrink-0`}
                        >
                          Nutzen
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Nicht verfügbar: Setze die serverseitige Variable
                JAMENDO_CLIENT_ID, um die CC-BY-Suche zu aktivieren.
              </p>
            )}
          </div>
          {progress ? (
            <div className="mt-4" role="status">
              <p className="text-neon-cyan text-sm">{progress.message}</p>
              <progress
                aria-label="Fortschritt der Audio-Vorbereitung"
                className="accent-neon-cyan mt-2 h-1.5 w-full"
                value={progress.fraction}
                max={1}
              />
              <Button
                variant="ghost"
                tone="neutral"
                className="mt-2 px-4 text-sm"
                onClick={() => preparation.current?.abort()}
              >
                Vorbereitung abbrechen
              </Button>
            </div>
          ) : null}
          {sourceError ? (
            <p role="alert" className="text-neon-magenta mt-4 text-sm">
              {sourceError}
            </p>
          ) : null}
        </section>

        {preparedTrack ? (
          <section aria-labelledby="analysis-title" className={card}>
            <h2 id="analysis-title" className="text-lg">
              Analyse & Korrektur
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              Einfache Energie-Analyse · Sicherheit{" "}
              {Math.round(preparedTrack.analysis.confidence * 100)} %. Sie kann
              halbes/doppeltes Tempo oder die falsche Phase erwischen – das ist
              keine Essentia-Analyse.
            </p>
            <div className="mt-4">
              <span id="tempo-label" className="text-sm">
                Tempo-Deutung
              </span>
              <div
                role="group"
                aria-labelledby="tempo-label"
                className="mt-2 flex gap-2"
              >
                {([0.5, 1, 2] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={session.active}
                    aria-pressed={tempoMultiplier === value}
                    onClick={() => setTempoMultiplier(value)}
                    className={`${chip} flex-1`}
                  >
                    {String(value).replace(".", ",")}×
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-sm">
              <span id="offset-label">Versatz der Schritte</span>
              <span className="text-neon-cyan font-mono">
                {chartOffsetMs > 0 ? "+" : ""}
                {chartOffsetMs} ms
              </span>
            </div>
            <div
              role="group"
              aria-labelledby="offset-label"
              className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5"
            >
              {[-50, -10, 10, 50].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  disabled={session.active}
                  onClick={() => adjustChartOffset(delta)}
                  className={`${chip} px-2`}
                >
                  {delta > 0 ? "+" : "−"}
                  {Math.abs(delta)} ms
                </button>
              ))}
              <button
                type="button"
                disabled={session.active || chartOffsetMs === 0}
                onClick={() => setChartOffsetMs(0)}
                className={`${chip} col-span-2 px-2 sm:col-span-1`}
              >
                Zurücksetzen
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/50">
              Vorschau:{" "}
              {chart.notes
                .slice(0, 6)
                .map(
                  (note) =>
                    `${(note.hitAtMs / 1000).toFixed(2).replace(".", ",")} s ${LANE_LABELS[note.lane]}`,
                )
                .join(" · ") || "keine Schritte"}
              . Korrekturen verschieben nur die Schritte – nie die
              Abspielgeschwindigkeit oder die Kalibrierung.
            </p>
          </section>
        ) : null}

        <section aria-labelledby="timing-title" className={card}>
          <h2 id="timing-title" className="text-lg">
            Kalibrierung
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Starte am besten mit eingebauten oder kabelgebundenen Lautsprechern.
            Kommt der Ton nach den Lichtern, erhöhe die Verzögerung. Bei
            Bluetooth hängt sie vom Gerät ab.
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <label htmlFor="alignment-delay">Verzögerung LED + Wertung</label>
            <span className="text-neon-cyan font-mono">
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
            aria-valuetext={`${alignmentDelayMs} Millisekunden`}
            onChange={(event) =>
              setAlignmentDelayMs(Number(event.target.value))
            }
            className="accent-neon-cyan mt-3 h-6 w-full disabled:opacity-40"
          />
          <p className="mt-1 text-xs text-white/50">
            Positive Werte verzögern Spielfeld und Wertung gemeinsam, nicht den
            Ton. Zum Anpassen die Runde stoppen.
          </p>
          <div className="mt-5 flex justify-between text-sm">
            <label htmlFor="rhythm-volume">Lautstärke</label>
            <span className="text-white/60">{Math.round(volume * 100)} %</span>
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
            className="accent-neon-cyan mt-3 h-6 w-full disabled:opacity-40"
          />
        </section>

        <section aria-labelledby="readout-title" className={card}>
          <div className="flex items-center justify-between gap-4">
            <h2 id="readout-title" className="text-lg">
              Auswertung
            </h2>
            <span className="text-neon-cyan font-mono text-xl">
              <span className="sr-only">Punkte: </span>
              {summary.score.toLocaleString("de-DE")} Pkt.
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
                ["perfect", "Perfekt", summary.perfect],
                ["good", "Gut", summary.good],
                ["miss", "Verpasst", summary.miss],
                ["stray", "Ins Leere", summary.strayPresses],
              ] as const
            ).map(([key, label, value]) => (
              <div key={key} className="rounded-xl bg-white/5 px-1 py-3">
                <dt className="text-xs text-white/60">{label}</dt>
                <dd className="mt-1 font-mono text-xl" data-stat={key}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-white/50">
            Perfekt: ±{PERFECT_MS} ms · Gut: ±{GOOD_MS} ms. Tritte ins Leere
            geben keine Punkte. Gedrückt halten wiederholt keinen Schritt.
          </p>
        </section>
      </div>
    </div>
  );
}
