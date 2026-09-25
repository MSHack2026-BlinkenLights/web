export type Lane = "left" | "down" | "up" | "right";

export interface RhythmNote {
  id: string;
  lane: Lane;
  /** Target time relative to the start of the song, not the count-in. */
  hitAtMs: number;
}

export interface RhythmChart {
  id: string;
  /** Exact provider/content version this chart was authored or generated for. */
  sourceIdentity: string;
  title: string;
  bpm: number;
  durationMs: number;
  approachMs: number;
  notes: readonly RhythmNote[];
}

/** Row-major indices on a 3×3 board; charts never depend on physical coordinates. */
export const BOARD_LAYOUT: Record<Lane, number> = {
  left: 3,
  down: 7,
  up: 1,
  right: 5,
};

export const PERFECT_MS = 60;
export const GOOD_MS = 140;
export const FEEDBACK_MS = 220;
export const TARGET_PULSE_MS = 90;
export const COUNT_IN_BEATS = 4;

export interface Judgment {
  noteId: string;
  lane: Lane;
  kind: "perfect" | "good" | "miss";
  /** Negative = early; positive = late; null = no press. */
  errorMs: number | null;
  judgedAtMs: number;
}

export interface RunState {
  judgments: readonly Judgment[];
  strayPresses: number;
}

export const createRun = (): RunState => ({ judgments: [], strayPresses: 0 });

/** Positive delay aligns both LEDs and scoring to audio heard later at the output. */
export function songPositionMs(
  audioTimeSeconds: number,
  songStartSeconds: number,
  alignmentDelayMs: number,
) {
  return (audioTimeSeconds - songStartSeconds) * 1000 - alignmentDelayMs;
}

/** Called with absolute song time, so skipped render frames never lose misses. */
export function expireNotes(
  chart: RhythmChart,
  state: RunState,
  atMs: number,
): RunState {
  const resolved = new Set(state.judgments.map((judgment) => judgment.noteId));
  const missed = chart.notes.filter(
    (note) => !resolved.has(note.id) && atMs > note.hitAtMs + GOOD_MS,
  );
  if (missed.length === 0) return state;
  return {
    ...state,
    judgments: [
      ...state.judgments,
      ...missed.map((note): Judgment => ({
        noteId: note.id,
        lane: note.lane,
        kind: "miss",
        errorMs: null,
        judgedAtMs: note.hitAtMs + GOOD_MS,
      })),
    ],
  };
}

/** A press can resolve only the nearest unjudged note in the same lane. */
export function judgePress(
  chart: RhythmChart,
  state: RunState,
  lane: Lane,
  atMs: number,
): RunState {
  const current = expireNotes(chart, state, atMs);
  const resolved = new Set(
    current.judgments.map((judgment) => judgment.noteId),
  );
  const candidate = chart.notes
    .filter((note) => note.lane === lane && !resolved.has(note.id))
    .filter((note) => Math.abs(atMs - note.hitAtMs) <= GOOD_MS)
    .sort((a, b) => Math.abs(atMs - a.hitAtMs) - Math.abs(atMs - b.hitAtMs))[0];

  if (!candidate) return { ...current, strayPresses: current.strayPresses + 1 };

  const errorMs = atMs - candidate.hitAtMs;
  return {
    ...current,
    judgments: [
      ...current.judgments,
      {
        noteId: candidate.id,
        lane,
        kind: Math.abs(errorMs) <= PERFECT_MS ? "perfect" : "good",
        errorMs,
        judgedAtMs: atMs,
      },
    ],
  };
}

/** Pure board projection. No timers, DOM, network, or persistence in the engine. */
export function renderBoard(
  chart: RhythmChart,
  state: RunState,
  atMs: number,
): (string | null)[] {
  const pixels: (string | null)[] = Array<string | null>(9).fill(null);
  const resolved = new Set(state.judgments.map((judgment) => judgment.noteId));

  for (const note of chart.notes) {
    if (resolved.has(note.id)) continue;
    const untilHit = note.hitAtMs - atMs;
    if (untilHit > chart.approachMs || untilHit < -GOOD_MS) continue;
    if (untilHit <= 0 && untilHit >= -TARGET_PULSE_MS) {
      pixels[BOARD_LAYOUT[note.lane]] = "#FFFFFF";
    } else {
      const progress = Math.max(
        0,
        Math.min(1, 1 - untilHit / chart.approachMs),
      );
      const brightness = 0.15 + progress * 0.85;
      const hex = [34, 228, 255]
        .map((channel) =>
          Math.round(channel * brightness)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
      pixels[BOARD_LAYOUT[note.lane]] = `#${hex}`;
    }
  }

  for (const judgment of state.judgments) {
    const ageMs = atMs - judgment.judgedAtMs;
    if (ageMs < 0 || ageMs >= FEEDBACK_MS) continue;
    pixels[BOARD_LAYOUT[judgment.lane]] =
      judgment.kind === "miss" ? "#FF3B3B" : "#3DFF7A";
  }
  return pixels;
}

export function summarizeRun(state: RunState) {
  const perfect = state.judgments.filter(
    (judgment) => judgment.kind === "perfect",
  ).length;
  const good = state.judgments.filter(
    (judgment) => judgment.kind === "good",
  ).length;
  const miss = state.judgments.filter(
    (judgment) => judgment.kind === "miss",
  ).length;
  return {
    perfect,
    good,
    miss,
    score: perfect * 1000 + good * 500,
    strayPresses: state.strayPresses,
  };
}
