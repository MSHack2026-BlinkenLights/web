import type { Lane, RhythmChart } from "./engine";
import type { BeatAnalysis, TrackIdentity } from "./source";

const GOOD_WINDOW_MS = 140;
const FEEDBACK_WINDOW_MS = 220;

export type TempoMultiplier = 0.5 | 1 | 2;

export interface ChartCorrections {
  tempoMultiplier: TempoMultiplier;
  /** Moves chart targets relative to the audio; independent of output calibration. */
  chartOffsetMs: number;
}

export interface ChartGenerationOptions extends ChartCorrections {
  identity: TrackIdentity;
  title: string;
  durationMs: number;
  approachMs?: number;
  minimumSpacingMs?: number;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Applies operator tempo/phase correction without changing playback speed. */
export function correctBeatTimestamps(
  beatTimestampsMs: readonly number[],
  corrections: ChartCorrections,
) {
  const ordered = [...beatTimestampsMs]
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  let interpreted: number[];
  if (corrections.tempoMultiplier === 0.5) {
    interpreted = ordered.filter((_, index) => index % 2 === 0);
  } else if (corrections.tempoMultiplier === 2) {
    interpreted = [];
    for (let index = 0; index < ordered.length; index++) {
      const current = ordered[index];
      if (current === undefined) continue;
      interpreted.push(current);
      const next = ordered[index + 1];
      if (next !== undefined) interpreted.push((current + next) / 2);
    }
  } else {
    interpreted = ordered;
  }
  return interpreted.map((timestamp) => timestamp + corrections.chartOffsetMs);
}

/**
 * Turns analyzed absolute beat timestamps into isolated taps for the LED-only UI.
 * Dense candidates are skipped rather than creating overlapping/impossible cues.
 */
export function generateChartFromAnalysis(
  analysis: BeatAnalysis,
  options: ChartGenerationOptions,
): RhythmChart {
  const approachMs = options.approachMs ?? 500;
  const minimumSpacingMs =
    options.minimumSpacingMs ??
    approachMs + GOOD_WINDOW_MS + FEEDBACK_WINDOW_MS + 40;
  const latestTargetMs =
    options.durationMs - GOOD_WINDOW_MS - FEEDBACK_WINDOW_MS;
  const corrected = correctBeatTimestamps(analysis.beatTimestampsMs, options);
  const selected: number[] = [];

  for (const timestamp of corrected) {
    if (timestamp < approachMs || timestamp > latestTargetMs) continue;
    const previous = selected.at(-1);
    if (previous === undefined || timestamp - previous >= minimumSpacingMs)
      selected.push(timestamp);
  }

  const identity = `${options.identity.provider}:${options.identity.providerTrackId}:${options.identity.contentVersion}`;
  const random = mulberry32(hashString(identity));
  const lanes: Lane[] = ["left", "down", "up", "right"];
  let previousLane: Lane | undefined;
  const notes = selected.map((hitAtMs, index) => {
    let lane = lanes[Math.floor(random() * lanes.length)] ?? "left";
    if (lane === previousLane)
      lane =
        lanes[(lanes.indexOf(lane) + 1 + Math.floor(random() * 3)) % 4] ??
        "right";
    previousLane = lane;
    return { id: `auto-${index + 1}`, lane, hitAtMs: Math.round(hitAtMs) };
  });

  return {
    id: `auto-${hashString(`${identity}:${options.tempoMultiplier}:${options.chartOffsetMs}`).toString(16)}`,
    sourceIdentity: identity,
    title: options.title,
    bpm: Math.round(analysis.bpm * options.tempoMultiplier * 10) / 10,
    durationMs: options.durationMs,
    approachMs,
    notes,
  };
}
