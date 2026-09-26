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
  report({
    stage: "fetching",
    fraction: 0,
    message: "Lokale Audiodatei wird gelesen …",
  });
  const bytes = await file.arrayBuffer();
  if (signal.aborted)
    throw new DOMException(
      "Die Audio-Vorbereitung wurde abgebrochen.",
      "AbortError",
    );
  report({
    stage: "fetching",
    fraction: 1,
    message: "Lokale Audiodatei geladen.",
  });
  const prepared = await decodeAndAnalyzeAudio(bytes, signal, report);
  const title = file.name.replace(/\.[^.]+$/, "") || "Eigener Track";
  return {
    metadata: {
      identity: {
        provider: "local",
        providerTrackId: file.name,
        contentVersion: prepared.contentHash,
      },
      title,
      artist: "Eigene Datei",
      durationMs: Math.round(prepared.buffer.duration * 1000),
      attribution: {
        creator: "Von dir bereitgestellt",
        provider: "Eigene Datei",
        licenseName: "Rechte nicht geprüft",
        notice:
          "Nutze nur Musik, die du abspielen und synchronisieren darfst. Die Datei bleibt im Browser-Speicher und wird von dieser App nicht hochgeladen.",
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
