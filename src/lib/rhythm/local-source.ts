import { decodeAndAnalyzeAudio, validateAudioFile } from "./prepare-audio";
import {
  LOCAL_CAPABILITIES,
  type PreparedAudioTrack,
  type ProgressReporter,
} from "./source";

export async function prepareLocalTrack(
  file: File,
  signal: AbortSignal,
  report: ProgressReporter,
): Promise<PreparedAudioTrack> {
  validateAudioFile(file);
  report({ stage: "fetching", fraction: 0, message: "Reading local audio…" });
  const bytes = await file.arrayBuffer();
  if (signal.aborted)
    throw new DOMException("Audio preparation was cancelled.", "AbortError");
  report({ stage: "fetching", fraction: 1, message: "Local audio loaded." });
  const prepared = await decodeAndAnalyzeAudio(bytes, signal, report);
  const title = file.name.replace(/\.[^.]+$/, "") || "Local track";
  return {
    metadata: {
      identity: {
        provider: "local",
        providerTrackId: file.name,
        contentVersion: prepared.contentHash,
      },
      title,
      artist: "Local file",
      durationMs: Math.round(prepared.buffer.duration * 1000),
      attribution: {
        creator: "Provided by the operator",
        provider: "Local file",
        licenseName: "Rights not verified",
        notice:
          "Use only audio you are authorized to play and synchronize. The file stays in browser memory and is not uploaded by this app.",
      },
    },
    capabilities: {
      ...LOCAL_CAPABILITIES,
      playback: "decoded-buffer",
      analysis: "pcm",
      clock: "scheduled-web-audio",
    },
    buffer: prepared.buffer,
    analysis: prepared.analysis,
  };
}
