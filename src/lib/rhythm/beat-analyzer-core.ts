import type { BeatAnalysis } from "./source";

export const SIMPLE_ANALYZER_ID = "energy-onset-grid-v1";

export interface MonoSamples {
  samples: Float32Array;
  sampleRate: number;
  durationMs: number;
}

/**
 * Lightweight, deterministic fallback analyzer. It estimates an onset envelope,
 * autocorrelates tempo, then locally snaps each beat to nearby energy changes.
 * It is intentionally not presented as equivalent to Essentia/RhythmExtractor2013.
 */
export function analyzeEnergyGrid(input: MonoSamples): BeatAnalysis {
  const { samples, sampleRate, durationMs } = input;
  if (sampleRate <= 0 || samples.length < sampleRate * 3)
    throw new Error("The track is too short for automatic beat analysis.");

  const windowSize = 512;
  const frameCount = Math.floor(samples.length / windowSize);
  const energy = new Float64Array(frameCount);
  let peakEnergy = 0;
  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    const start = frame * windowSize;
    for (let offset = 0; offset < windowSize; offset++) {
      const sample = samples[start + offset] ?? 0;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / windowSize);
    energy[frame] = rms;
    peakEnergy = Math.max(peakEnergy, rms);
  }
  if (peakEnergy < 0.0005)
    throw new Error("No usable audio energy was found in this track.");

  const novelty = new Float64Array(frameCount);
  let noveltyTotal = 0;
  for (let frame = 1; frame < frameCount; frame++) {
    const localAverage =
      ((energy[frame - 1] ?? 0) +
        (energy[frame - 2] ?? 0) +
        (energy[frame - 3] ?? 0)) /
      3;
    const value = Math.max(0, (energy[frame] ?? 0) - localAverage * 0.82);
    novelty[frame] = value;
    noveltyTotal += value;
  }
  if (noveltyTotal < 0.001)
    throw new Error("A stable pulse could not be found in this track.");

  const framesPerSecond = sampleRate / windowSize;
  const minimumLag = Math.max(2, Math.floor((framesPerSecond * 60) / 190));
  const maximumLag = Math.min(
    frameCount - 1,
    Math.ceil((framesPerSecond * 60) / 60),
  );
  let bestLag = minimumLag;
  let bestScore = -Infinity;
  for (let lag = minimumLag; lag <= maximumLag; lag++) {
    let score = 0;
    let count = 0;
    for (let frame = lag; frame < frameCount; frame++) {
      score += (novelty[frame] ?? 0) * (novelty[frame - lag] ?? 0);
      count++;
    }
    // Mild preference for common dance tempos resolves many half/double ties.
    const bpm = (60 * framesPerSecond) / lag;
    const tempoPreference =
      0.9 + 0.1 * Math.exp(-Math.pow((bpm - 120) / 45, 2));
    const normalized = (score / Math.max(1, count)) * tempoPreference;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestLag = lag;
    }
  }

  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  for (let phase = 0; phase < bestLag; phase++) {
    let score = 0;
    for (let frame = phase; frame < frameCount; frame += bestLag)
      score += novelty[frame] ?? 0;
    if (score > bestPhaseScore) {
      bestPhaseScore = score;
      bestPhase = phase;
    }
  }

  const searchRadius = Math.max(1, Math.floor(bestLag * 0.2));
  const timestamps: number[] = [];
  let previous = -Infinity;
  for (let expected = bestPhase; expected < frameCount; expected += bestLag) {
    let strongest = expected;
    for (
      let frame = Math.max(0, expected - searchRadius);
      frame <= Math.min(frameCount - 1, expected + searchRadius);
      frame++
    ) {
      if ((novelty[frame] ?? 0) > (novelty[strongest] ?? 0)) strongest = frame;
    }
    const timestamp = ((strongest + 0.5) * windowSize * 1000) / sampleRate;
    if (timestamp - previous > (bestLag * windowSize * 1000) / sampleRate / 2) {
      timestamps.push(Math.min(durationMs, timestamp));
      previous = timestamp;
    }
  }

  const meanNovelty = noveltyTotal / frameCount;
  const pulseStrength = bestPhaseScore / Math.max(1, timestamps.length);
  const confidence = Math.max(
    0,
    Math.min(1, (pulseStrength / Math.max(meanNovelty, 1e-8) - 1) / 5),
  );
  const bpm = (60 * framesPerSecond) / bestLag;
  const warnings = [
    "Fallback energy-grid analysis can choose the wrong tempo or phase; preview and correct it before playing.",
  ];
  if (confidence < 0.35)
    warnings.push(
      "Low-confidence pulse: use the tempo and chart-offset controls.",
    );

  return {
    analyzerId: SIMPLE_ANALYZER_ID,
    bpm: Math.round(bpm * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    beatTimestampsMs: timestamps,
    warnings,
  };
}
