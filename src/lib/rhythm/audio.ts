import { COUNT_IN_BEATS, type RhythmChart } from "./engine";

export interface RhythmAudio {
  context: AudioContext;
  /** Schedules count-in and song, returning song-zero in AudioContext seconds. */
  start: () => number;
  dispose: () => void;
}

function addTone(
  samples: Float32Array,
  sampleRate: number,
  atSeconds: number,
  frequency: number,
  duration: number,
  amplitude: number,
) {
  const start = Math.round(atSeconds * sampleRate);
  const length = Math.round(duration * sampleRate);
  for (let index = 0; index < length; index++) {
    const position = start + index;
    if (position >= samples.length) break;
    const seconds = index / sampleRate;
    const envelope = Math.min(1, seconds / 0.003) * Math.exp(-seconds * 45);
    samples[position] =
      (samples[position] ?? 0) +
      Math.sin(2 * Math.PI * frequency * seconds) * envelope * amplitude;
  }
}

function createGeneratedSong(context: AudioContext, chart: RhythmChart) {
  const buffer = context.createBuffer(
    1,
    Math.ceil((chart.durationMs / 1000) * context.sampleRate),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  const beatSeconds = 60 / chart.bpm;
  for (let beat = 0; beat * beatSeconds < chart.durationMs / 1000; beat++) {
    const accent = beat % 4 === 0;
    addTone(
      samples,
      context.sampleRate,
      beat * beatSeconds,
      accent ? 880 : 660,
      0.12,
      accent ? 0.4 : 0.22,
    );
  }
  const laneTones = { left: 261.63, down: 329.63, up: 392, right: 523.25 };
  for (const note of chart.notes) {
    addTone(
      samples,
      context.sampleRate,
      note.hitAtMs / 1000,
      laneTones[note.lane],
      0.22,
      0.35,
    );
  }
  return buffer;
}

function createCountIn(context: AudioContext, chart: RhythmChart) {
  const beatSeconds = 60 / chart.bpm;
  const duration = COUNT_IN_BEATS * beatSeconds;
  const buffer = context.createBuffer(
    1,
    Math.ceil(duration * context.sampleRate),
    context.sampleRate,
  );
  const samples = buffer.getChannelData(0);
  for (let beat = 0; beat < COUNT_IN_BEATS; beat++) {
    addTone(
      samples,
      context.sampleRate,
      beat * beatSeconds,
      beat === 0 ? 1046.5 : 784,
      0.12,
      beat === 0 ? 0.5 : 0.3,
    );
  }
  return buffer;
}

/**
 * A fresh scheduler is created per run. Prepared real audio is fully decoded
 * before this point; omitted audio selects the original generated demo.
 */
export function createRhythmAudio(
  chart: RhythmChart,
  volume: number,
  preparedBuffer?: AudioBuffer,
): RhythmAudio {
  const context = new AudioContext({ latencyHint: "interactive" });
  const gain = context.createGain();
  gain.gain.value = Math.max(0, Math.min(1, volume));
  gain.connect(context.destination);

  const countInSource = context.createBufferSource();
  countInSource.buffer = createCountIn(context, chart);
  countInSource.connect(gain);
  const songSource = context.createBufferSource();
  songSource.buffer = preparedBuffer ?? createGeneratedSong(context, chart);
  songSource.connect(gain);

  const countInSeconds = COUNT_IN_BEATS * (60 / chart.bpm);
  let started = false;
  let disposed = false;

  return {
    context,
    start() {
      if (disposed || started || context.state !== "running")
        throw new Error("Audio is not ready. Press Start to try again.");
      // Both sources share one scheduled origin; rendering and input derive from it.
      const countInStart = context.currentTime + 0.15;
      const songStart = countInStart + countInSeconds;
      countInSource.start(countInStart);
      songSource.start(songStart);
      started = true;
      return songStart;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      context.onstatechange = null;
      if (started) {
        countInSource.stop();
        songSource.stop();
      }
      countInSource.disconnect();
      songSource.disconnect();
      gain.disconnect();
      if (context.state !== "closed")
        void context.close().catch(() => undefined);
    },
  };
}
