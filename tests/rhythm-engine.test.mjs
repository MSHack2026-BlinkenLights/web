import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BOARD_LAYOUT,
  GOOD_MS,
  PERFECT_MS,
  FEEDBACK_MS,
  createRun,
  expireNotes,
  judgePress,
  renderBoard,
  songPositionMs,
  summarizeRun,
} from "../src/lib/rhythm/engine.ts";
import { DEMO_CHART } from "../src/lib/rhythm/demo-chart.ts";

const chart = {
  id: "test",
  sourceIdentity: "generated:test:v1",
  title: "Test",
  bpm: 120,
  durationMs: 3000,
  approachMs: 500,
  notes: [
    { id: "one", lane: "left", hitAtMs: 1000 },
    { id: "two", lane: "right", hitAtMs: 2000 },
  ],
};

test("alignment delay shifts visuals and scoring onto the same timeline", () => {
  assert.equal(songPositionMs(12, 10, 0), 2000);
  assert.equal(songPositionMs(12, 10, 250), 1750);
  assert.equal(songPositionMs(9, 10, -100), -900);
  const delayedHit = judgePress(
    chart,
    createRun(),
    "left",
    songPositionMs(11.25, 10, 250),
  );
  assert.equal(delayedHit.judgments[0].kind, "perfect");
});

test("hit windows include exact early/late boundaries and preserve error sign", () => {
  for (const errorMs of [-GOOD_MS, -PERFECT_MS, 0, PERFECT_MS, GOOD_MS]) {
    const state = judgePress(chart, createRun(), "left", 1000 + errorMs);
    const judgment = state.judgments[0];
    assert.equal(
      judgment.kind,
      Math.abs(errorMs) <= PERFECT_MS ? "perfect" : "good",
    );
    assert.equal(judgment.errorMs, errorMs);
  }
});

test("presses outside the window or in a different lane do not consume the note", () => {
  const early = judgePress(chart, createRun(), "left", 1000 - GOOD_MS - 1);
  assert.equal(early.judgments.length, 0);
  assert.equal(early.strayPresses, 1);
  const wrong = judgePress(chart, early, "up", 1000);
  assert.equal(wrong.judgments.length, 0);
  assert.equal(
    judgePress(chart, wrong, "left", 1000).judgments[0].kind,
    "perfect",
  );
});

test("one note cannot be scored twice", () => {
  const hit = judgePress(chart, createRun(), "left", 1000);
  const duplicate = judgePress(chart, hit, "left", 1001);
  assert.equal(duplicate.judgments.length, 1);
  assert.equal(duplicate.strayPresses, 1);
  assert.deepEqual(summarizeRun(duplicate), {
    perfect: 1,
    good: 0,
    miss: 0,
    score: 1000,
    strayPresses: 1,
  });
});

test("nearest unresolved note is selected if hit windows overlap", () => {
  const close = {
    ...chart,
    notes: [...chart.notes, { id: "close", lane: "left", hitAtMs: 1200 }],
  };
  const state = judgePress(close, createRun(), "left", 1120);
  assert.equal(state.judgments[0].noteId, "close");
});

test("misses expire once, even after skipped frames, but not on the inclusive boundary", () => {
  const initial = createRun();
  assert.equal(expireNotes(chart, initial, 1000 + GOOD_MS), initial);
  const missed = expireNotes(chart, initial, 5000);
  assert.equal(missed.judgments.length, 2);
  assert.ok(missed.judgments.every((judgment) => judgment.kind === "miss"));
  assert.equal(expireNotes(chart, missed, 6000), missed);
  assert.equal(initial.judgments.length, 0, "engine does not mutate inputs");
  const late = judgePress(chart, initial, "left", 1141);
  assert.equal(late.judgments[0].kind, "miss");
  assert.equal(late.strayPresses, 1);
});

test("board projects dim approach, increasing brightness, target pulse, then darkness", () => {
  const initial = createRun();
  assert.deepEqual(renderBoard(chart, initial, 499), Array(9).fill(null));
  const dim = renderBoard(chart, initial, 500)[BOARD_LAYOUT.left];
  const bright = renderBoard(chart, initial, 999)[BOARD_LAYOUT.left];
  assert.notEqual(dim, null);
  assert.ok(parseInt(dim.slice(1), 16) < parseInt(bright.slice(1), 16));
  assert.equal(renderBoard(chart, initial, 1000)[BOARD_LAYOUT.left], "#FFFFFF");
  assert.equal(renderBoard(chart, initial, 1500)[BOARD_LAYOUT.left], null);
  assert.equal(renderBoard(chart, initial, 1000).filter(Boolean).length, 1);
});

test("judgments render short green/red feedback, never an endless flash after a delayed frame", () => {
  const hit = judgePress(chart, createRun(), "left", 1000);
  assert.equal(renderBoard(chart, hit, 1000)[BOARD_LAYOUT.left], "#3DFF7A");
  assert.equal(
    renderBoard(chart, hit, 1000 + FEEDBACK_MS)[BOARD_LAYOUT.left],
    null,
  );
  const missed = expireNotes(chart, createRun(), 1141);
  assert.equal(renderBoard(chart, missed, 1141)[BOARD_LAYOUT.left], "#FF3B3B");
  const stale = expireNotes(chart, createRun(), 5000);
  assert.deepEqual(renderBoard(chart, stale, 5000), Array(9).fill(null));
});

test("demo is deterministic, isolated and fits within the track", () => {
  assert.equal(DEMO_CHART.notes.length, 16);
  assert.equal(new Set(DEMO_CHART.notes.map((note) => note.id)).size, 16);
  for (const [index, note] of DEMO_CHART.notes.entries()) {
    assert.ok(note.lane in BOARD_LAYOUT);
    assert.ok(note.hitAtMs + GOOD_MS + FEEDBACK_MS < DEMO_CHART.durationMs);
    if (index > 0)
      assert.ok(
        note.hitAtMs - DEMO_CHART.notes[index - 1].hitAtMs >
          DEMO_CHART.approachMs + GOOD_MS + FEEDBACK_MS,
      );
  }
});
