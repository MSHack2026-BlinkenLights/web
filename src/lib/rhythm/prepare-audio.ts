import type {
  BeatAnalysis,
  PreparationProgress,
  ProgressReporter,
} from "./source";

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 5 * 60;
const ANALYSIS_SAMPLE_RATE = 11_025;

function abortError() {
  return new DOMException("Audio preparation was cancelled.", "AbortError");
}

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw abortError();
}

export function validateAudioFile(file: Pick<File, "name" | "size" | "type">) {
  if (file.size === 0) throw new Error("The selected audio file is empty.");
  if (file.size > MAX_AUDIO_BYTES)
    throw new Error("Choose an audio file no larger than 20 MB.");
  const extension = file.name.toLowerCase().split(".").at(-1);
  const supportedExtension = [
    "mp3",
    "wav",
    "m4a",
    "aac",
    "ogg",
    "webm",
  ].includes(extension ?? "");
  if (!file.type.startsWith("audio/") && !supportedExtension)
    throw new Error(
      "Choose a supported audio file (MP3, WAV, M4A, AAC, OGG, or WebM). ",
    );
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function downmixForAnalysis(
  buffer: AudioBuffer,
  signal: AbortSignal,
  report: ProgressReporter,
) {
  const stride = Math.max(
    1,
    Math.round(buffer.sampleRate / ANALYSIS_SAMPLE_RATE),
  );
  const outputRate = buffer.sampleRate / stride;
  const samples = new Float32Array(Math.ceil(buffer.length / stride));
  const channels = Array.from(
    { length: buffer.numberOfChannels },
    (_, channel) => buffer.getChannelData(channel),
  );
  const chunkSize = 100_000;
  for (let outputIndex = 0; outputIndex < samples.length; outputIndex++) {
    let value = 0;
    const sourceIndex = outputIndex * stride;
    for (const channel of channels) value += channel[sourceIndex] ?? 0;
    samples[outputIndex] = value / channels.length;
    if (outputIndex > 0 && outputIndex % chunkSize === 0) {
      checkAbort(signal);
      report({
        stage: "analyzing",
        fraction: 0.1 + (outputIndex / samples.length) * 0.25,
        message: "Preparing a lightweight analysis copy…",
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  return { samples, sampleRate: outputRate };
}

async function analyzeInWorker(
  samples: Float32Array,
  sampleRate: number,
  durationMs: number,
  signal: AbortSignal,
): Promise<BeatAnalysis> {
  checkAbort(signal);
  const worker = new Worker(
    new URL("./beat-analysis-worker.ts", import.meta.url),
  );
  return new Promise((resolve, reject) => {
    const abort = () => {
      worker.terminate();
      reject(abortError());
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
      reject(new Error("The beat-analysis worker could not start."));
    };
    worker.onmessage = (
      event: MessageEvent<
        { ok: true; result: BeatAnalysis } | { ok: false; message: string }
      >,
    ) => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.message));
    };
    worker.postMessage({ samples: samples.buffer, sampleRate, durationMs }, [
      samples.buffer,
    ]);
  });
}

export interface DecodedAndAnalyzedAudio {
  buffer: AudioBuffer;
  analysis: BeatAnalysis;
  contentHash: string;
}

/** Decode fully before play; no streaming clock is used for scored gameplay. */
export async function decodeAndAnalyzeAudio(
  bytes: ArrayBuffer,
  signal: AbortSignal,
  report: ProgressReporter,
): Promise<DecodedAndAnalyzedAudio> {
  if (bytes.byteLength === 0) throw new Error("The audio response was empty.");
  if (bytes.byteLength > MAX_AUDIO_BYTES)
    throw new Error("The audio response exceeded the 20 MB limit.");
  checkAbort(signal);
  report({
    stage: "decoding",
    fraction: 0,
    message: "Decoding the complete track…",
  });

  const context = new AudioContext({ latencyHint: "playback" });
  try {
    const [buffer, contentHash] = await Promise.all([
      context.decodeAudioData(bytes.slice(0)),
      sha256(bytes),
    ]);
    checkAbort(signal);
    if (buffer.duration > MAX_AUDIO_DURATION_SECONDS)
      throw new Error("Choose a track no longer than 5 minutes.");
    if (buffer.duration < 3)
      throw new Error("Choose a track at least 3 seconds long.");
    report({
      stage: "analyzing",
      fraction: 0.05,
      message: "Finding a playable pulse…",
    });
    const mono = await downmixForAnalysis(buffer, signal, report);
    const analysis = await analyzeInWorker(
      mono.samples,
      mono.sampleRate,
      buffer.duration * 1000,
      signal,
    );
    checkAbort(signal);
    report({ stage: "analyzing", fraction: 1, message: "Analysis ready." });
    return { buffer, analysis, contentHash };
  } catch (error) {
    if (signal.aborted) throw abortError();
    if (error instanceof DOMException && error.name === "EncodingError")
      throw new Error("This browser could not decode that audio file.");
    throw error;
  } finally {
    if (context.state !== "closed")
      await context.close().catch(() => undefined);
  }
}

export async function readBoundedResponse(
  response: Response,
  signal: AbortSignal,
  report: (progress: PreparationProgress) => void,
) {
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error ?? "";
    } catch {
      // Keep the status-based message for non-JSON failures.
    }
    throw new Error(detail || `Audio download failed (${response.status}).`);
  }
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_AUDIO_BYTES)
    throw new Error("The audio response exceeded the 20 MB limit.");
  if (!response.body) return response.arrayBuffer();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    checkAbort(signal);
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_AUDIO_BYTES) {
      await reader.cancel();
      throw new Error("The audio response exceeded the 20 MB limit.");
    }
    chunks.push(value);
    report({
      stage: "fetching",
      fraction: declaredSize > 0 ? Math.min(1, received / declaredSize) : 0,
      message: `Loading audio… ${Math.round(received / 1024 / 1024)} MB`,
    });
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}
