"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createRhythmAudio, type RhythmAudio } from "wbl/lib/rhythm/audio";
import {
  createRun,
  expireNotes,
  judgePress,
  songPositionMs,
  type Lane,
  type RhythmChart,
  type RunState,
} from "wbl/lib/rhythm/engine";

export type Phase =
  | "idle"
  | "preparing"
  | "count-in"
  | "playing"
  | "finished"
  | "stopped"
  | "error";

interface Snapshot {
  phase: Phase;
  songMs: number;
  state: RunState;
  message: string;
}

interface Runtime {
  audio: RhythmAudio;
  startSeconds: number;
  delayMs: number;
  state: RunState;
}

const KEY_LANES: Record<string, Lane | undefined> = {
  ArrowLeft: "left",
  ArrowDown: "down",
  ArrowUp: "up",
  ArrowRight: "right",
};

/** Audio time is authoritative; RAF merely projects the latest state for React. */
export function useRhythmSession(chart: RhythmChart) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    phase: "idle",
    songMs: 0,
    state: createRun(),
    message: "Bereit, wenn du es bist.",
  });
  const [held, setHeld] = useState<readonly Lane[]>([]);
  const runtime = useRef<Runtime | null>(null);
  const pendingAudio = useRef<RhythmAudio | null>(null);
  const generation = useRef(0);
  const frame = useRef<number | null>(null);
  const pressed = useRef(new Set<Lane>());

  const release = useCallback(() => {
    generation.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    runtime.current?.audio.dispose();
    pendingAudio.current?.dispose();
    runtime.current = null;
    pendingAudio.current = null;
    pressed.current.clear();
  }, []);

  const stop = useCallback(
    (message = "Gestoppt. Starte neu für ein frisches Einzählen.") => {
      release();
      setHeld([]);
      setSnapshot((previous) => ({ ...previous, phase: "stopped", message }));
    },
    [release],
  );

  const start = useCallback(
    async (delayMs: number, volume: number, preparedBuffer?: AudioBuffer) => {
      release();
      setHeld([]);
      const token = generation.current;
      setSnapshot({
        phase: "preparing",
        songMs: 0,
        state: createRun(),
        message: "Audio im Browser wird vorbereitet …",
      });

      try {
        const audio = createRhythmAudio(chart, volume, preparedBuffer);
        pendingAudio.current = audio;
        // Must be invoked from the Start button's user gesture for autoplay policies.
        await audio.context.resume();
        if (generation.current !== token) {
          audio.dispose();
          return;
        }
        const run: Runtime = {
          audio,
          startSeconds: audio.start(),
          delayMs,
          state: createRun(),
        };
        runtime.current = run;
        pendingAudio.current = null;
        audio.context.onstatechange = () => {
          if (runtime.current === run && audio.context.state !== "running") {
            stop(
              "Der Ton wurde unterbrochen. Prüfe dein Ausgabegerät und starte neu.",
            );
          }
        };

        const tick = () => {
          if (runtime.current !== run) return;
          const songMs = songPositionMs(
            audio.context.currentTime,
            run.startSeconds,
            run.delayMs,
          );
          run.state = expireNotes(chart, run.state, songMs);
          if (songMs >= chart.durationMs) {
            setSnapshot({
              phase: "finished",
              songMs: chart.durationMs,
              state: run.state,
              message:
                "Runde geschafft! Schau dir dein Timing an oder versuch es nochmal.",
            });
            release();
            setHeld([]);
            return;
          }
          setSnapshot({
            phase: songMs < 0 ? "count-in" : "playing",
            songMs,
            state: run.state,
            message:
              songMs < 0
                ? "Hör auf die vier Einzähl-Schläge."
                : "Folge dem Spielfeld. Tritt, sobald ein Feld weiß wird.",
          });
          frame.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (error) {
        if (generation.current !== token) return;
        release();
        setSnapshot({
          phase: "error",
          songMs: 0,
          state: createRun(),
          message:
            error instanceof Error
              ? error.message
              : "Der Ton konnte nicht starten. Prüfe die Audio-Berechtigung im Browser und versuch es nochmal.",
        });
      }
    },
    [chart, release, stop],
  );

  const press = useCallback(
    (lane: Lane) => {
      const run = runtime.current;
      if (!run || pressed.current.has(lane)) return;
      pressed.current.add(lane);
      setHeld([...pressed.current]);
      // Sample the audio clock on input, not the last rendered frame's timestamp.
      const songMs = songPositionMs(
        run.audio.context.currentTime,
        run.startSeconds,
        run.delayMs,
      );
      if (songMs < 0 || songMs >= chart.durationMs) return;
      run.state = judgePress(chart, run.state, lane, songMs);
      setSnapshot((previous) => ({ ...previous, songMs, state: run.state }));
    },
    [chart],
  );

  const lift = useCallback((lane: Lane) => {
    if (pressed.current.delete(lane)) setHeld([...pressed.current]);
  }, []);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (!runtime.current && !pendingAudio.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        stop();
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, [contenteditable=true]")
      )
        return;
      const lane = KEY_LANES[event.key];
      if (!lane) return;
      event.preventDefault();
      if (!event.repeat) press(lane);
    }
    function keyUp(event: KeyboardEvent) {
      const lane = KEY_LANES[event.key];
      if (lane) lift(lane);
    }
    function interrupt() {
      if (runtime.current || pendingAudio.current)
        stop(
          "Runde gestoppt, weil die Seite den Fokus verloren hat. Starte neu, damit das Timing stimmt.",
        );
    }
    function visibilityChanged() {
      if (document.hidden) interrupt();
    }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", visibilityChanged);
      release();
    };
  }, [lift, press, release, stop]);

  return {
    ...snapshot,
    held,
    start,
    stop,
    press,
    lift,
    active:
      snapshot.phase === "preparing" ||
      snapshot.phase === "count-in" ||
      snapshot.phase === "playing",
  };
}
