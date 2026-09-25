import { COUNT_IN_BEATS, type RhythmChart } from "./engine";

export interface RhythmAudio {
  context: AudioContext;
  /** Schedules the whole buffer and returns song-zero in AudioContext seconds. */
  start: () => number;
  dispose: () => void;
}

/**
 * Generated original audio; no files, streaming service, timers, or network.
 * Construct/resume only in a user gesture. A fresh source is required per run.
 */
export function createRhythmAudio(
  chart: RhythmChart,
  volume: number,
): RhythmAudio {
  const context = new AudioContext({ latencyHint: "interactive" });
  const beatSeconds = 60 / chart.bpm;
  const countInSeconds = COUNT_IN_BEATS * beatSeconds;
  const totalSeconds = countInSeconds + chart.durationMs / 1000;
  const buffer = context.createBuffer(
    1,
    Math.ceil(totalSeconds * context.sampleRate),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);

  function addTone(
    atSeconds: number,
    frequency: number,
    duration: number,
    amplitude: number,
  ) {
    const start = Math.round(atSeconds * context.sampleRate);
    const length = Math.round(duration * context.sampleRate);
    for (let index = 0; index < length; index++) {
      const position = start + index;
      if (position >= samples.length) break;
      const seconds = index / context.sampleRate;
      const envelope = Math.min(1, seconds / 0.003) * Math.exp(-seconds * 45);
      samples[position] =
        (samples[position] ?? 0) +
        Math.sin(2 * Math.PI * frequency * seconds) * envelope * amplitude;
    }
  }

  for (let beat = 0; beat * beatSeconds < totalSeconds; beat++) {
    const accent = beat % 4 === 0;
    addTone(beat * beatSeconds, accent ? 880 : 660, 0.12, accent ? 0.4 : 0.22);
  }
  const laneTones = { left: 261.63, down: 329.63, up: 392, right: 523.25 };
  for (const note of chart.notes) {
    addTone(
      countInSeconds + note.hitAtMs / 1000,
      laneTones[note.lane],
      0.22,
      0.35,
    );
  }

  const gain = context.createGain();
  gain.gain.value = Math.max(0, Math.min(1, volume));
  gain.connect(context.destination);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  let started = false;
  let disposed = false;

  return {
    context,
    start() {
      if (disposed || started || context.state !== "running") {
        throw new Error("Audio is not ready. Press Start to try again.");
      }
      // Schedule ahead; render/input derive position from this exact origin.
      const bufferStart = context.currentTime + 0.15;
      source.start(bufferStart);
      started = true;
      return bufferStart + countInSeconds;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      context.onstatechange = null;
      if (started) source.stop();
      source.disconnect();
      gain.disconnect();
      if (context.state !== "closed")
        void context.close().catch(() => undefined);
    },
  };
}
