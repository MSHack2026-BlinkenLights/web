import assert from "node:assert/strict";
import { test } from "node:test";

import { analyzeEnergyGrid } from "../src/lib/rhythm/beat-analyzer-core.ts";
import {
  correctBeatTimestamps,
  generateChartFromAnalysis,
} from "../src/lib/rhythm/chart-generator.ts";
import {
  isAllowedJamendoMediaUrl,
  parseJamendoTracks,
} from "../src/lib/rhythm/jamendo.ts";

const identity = {
  provider: "local",
  providerTrackId: "fixture.wav",
  contentVersion: "abc123",
};
const analysis = {
  analyzerId: "fixture",
  bpm: 120,
  confidence: 0.8,
  beatTimestampsMs: [100, 600, 1100, 1600, 2100, 2600, 3100, 3600, 4100],
  warnings: [],
};

test("tempo interpretation changes timestamps without changing source identity", () => {
  assert.deepEqual(
    correctBeatTimestamps([0, 500, 1000], {
      tempoMultiplier: 0.5,
      chartOffsetMs: 50,
    }),
    [50, 1050],
  );
  assert.deepEqual(
    correctBeatTimestamps([0, 500, 1000], {
      tempoMultiplier: 1,
      chartOffsetMs: -10,
    }),
    [-10, 490, 990],
  );
  assert.deepEqual(
    correctBeatTimestamps([0, 500, 1000], {
      tempoMultiplier: 2,
      chartOffsetMs: 0,
    }),
    [0, 250, 500, 750, 1000],
  );
});

test("generated charts are deterministic, asset-bound and safely spaced", () => {
  const options = {
    identity,
    title: "Fixture",
    durationMs: 5000,
    tempoMultiplier: 1,
    chartOffsetMs: 0,
  };
  const first = generateChartFromAnalysis(analysis, options);
  const second = generateChartFromAnalysis(analysis, options);
  assert.deepEqual(first, second);
  assert.equal(first.sourceIdentity, "local:fixture.wav:abc123");
  assert.ok(first.notes.length >= 3);
  for (let index = 1; index < first.notes.length; index++) {
    assert.ok(
      first.notes[index].hitAtMs - first.notes[index - 1].hitAtMs >= 900,
    );
    assert.notEqual(first.notes[index].lane, first.notes[index - 1].lane);
  }
  const changedAsset = generateChartFromAnalysis(analysis, {
    ...options,
    identity: { ...identity, contentVersion: "different" },
  });
  assert.notEqual(first.id, changedAsset.id);
});

test("Jamendo fixtures retain only bounded, explicit CC BY tracks", () => {
  const tracks = parseJamendoTracks({
    results: [
      {
        id: "42",
        name: "Allowed",
        artist_name: "Artist",
        duration: 180,
        shareurl: "https://www.jamendo.com/track/42/allowed",
        audio: "https://prod-1.storage.jamendo.com/audio.mp3",
        license_ccurl: "http://creativecommons.org/licenses/by/4.0/",
      },
      {
        id: "43",
        name: "No derivatives",
        artist_name: "Artist",
        duration: 180,
        shareurl: "https://www.jamendo.com/track/43/nd",
        audio: "https://prod-1.storage.jamendo.com/nd.mp3",
        license_ccurl: "https://creativecommons.org/licenses/by-nd/4.0/",
      },
      {
        id: "44",
        name: "Too long",
        artist_name: "Artist",
        duration: 301,
        shareurl: "https://www.jamendo.com/track/44/long",
        audio: "https://prod-1.storage.jamendo.com/long.mp3",
        license_ccurl: "https://creativecommons.org/licenses/by/3.0/",
      },
    ],
  });
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].licenseName, "CC BY 4.0");
  assert.equal(
    tracks[0].licenseUrl,
    "https://creativecommons.org/licenses/by/4.0/",
  );
});

test("Jamendo media allowlist rejects redirects outside strict HTTPS hosts", () => {
  assert.equal(
    isAllowedJamendoMediaUrl(
      "https://prod-1.storage.jamendo.com/path/file.mp3",
    ),
    true,
  );
  assert.equal(isAllowedJamendoMediaUrl("http://jamendo.com/file.mp3"), false);
  assert.equal(
    isAllowedJamendoMediaUrl("https://jamendo.com.evil.test/file"),
    false,
  );
  assert.equal(
    isAllowedJamendoMediaUrl("https://user@jamendo.com/file"),
    false,
  );
});

test("fallback analyzer returns absolute, locally snapped beat timestamps", () => {
  const sampleRate = 11_025;
  const samples = new Float32Array(sampleRate * 12);
  for (let beat = 0; beat < 24; beat++) {
    const start = Math.round(beat * 0.5 * sampleRate);
    for (let index = 0; index < 300; index++) {
      const envelope = Math.exp(-index / 80);
      samples[start + index] =
        Math.sin((index / sampleRate) * Math.PI * 2 * 180) * envelope;
    }
  }
  const result = analyzeEnergyGrid({ samples, sampleRate, durationMs: 12_000 });
  assert.ok(result.bpm >= 115 && result.bpm <= 125, `bpm=${result.bpm}`);
  assert.ok(result.beatTimestampsMs.length >= 20);
  assert.ok(
    result.beatTimestampsMs.every(
      (value, index, values) => index === 0 || value > values[index - 1],
    ),
  );
});
