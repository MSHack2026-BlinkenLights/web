/// <reference lib="webworker" />

import { analyzeEnergyGrid } from "./beat-analyzer-core";

interface AnalyzeRequest {
  samples: ArrayBuffer;
  sampleRate: number;
  durationMs: number;
}

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  try {
    const result = analyzeEnergyGrid({
      samples: new Float32Array(event.data.samples),
      sampleRate: event.data.sampleRate,
      durationMs: event.data.durationMs,
    });
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Die automatische Beat-Analyse ist fehlgeschlagen.",
    });
  }
};
