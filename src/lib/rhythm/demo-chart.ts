import type { Lane, RhythmChart } from "./engine";

const lanes: Lane[] = [
  "left",
  "down",
  "up",
  "right",
  "up",
  "left",
  "right",
  "down",
  "right",
  "up",
  "down",
  "left",
  "down",
  "right",
  "left",
  "up",
];

/** Isolated taps, one per second; plenty of space for cues and hit feedback. */
export const DEMO_CHART: RhythmChart = {
  id: "first-steps-120",
  title: "First steps",
  bpm: 120,
  durationMs: 18_000,
  approachMs: 500,
  notes: lanes.map((lane, index) => ({
    id: `note-${index + 1}`,
    lane,
    hitAtMs: (index + 1) * 1000,
  })),
};
