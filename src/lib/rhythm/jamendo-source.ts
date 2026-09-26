import type { JamendoCatalogTrack } from "./jamendo";
import { decodeAndAnalyzeAudio, readBoundedResponse } from "./prepare-audio";
import {
  JAMENDO_CAPABILITIES,
  type PreparedAudioTrack,
  type ProgressReporter,
} from "./source";

function isCatalogTrack(value: unknown): value is JamendoCatalogTrack {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    /^\d+$/.test(item.id) &&
    typeof item.title === "string" &&
    typeof item.artist === "string" &&
    typeof item.durationMs === "number" &&
    typeof item.trackUrl === "string" &&
    typeof item.licenseUrl === "string" &&
    typeof item.licenseName === "string"
  );
}

export async function searchJamendo(
  query: string,
  signal: AbortSignal,
): Promise<JamendoCatalogTrack[]> {
  const response = await fetch(
    `/api/rhythm/jamendo?q=${encodeURIComponent(query)}`,
    {
      signal,
      headers: { Accept: "application/json" },
    },
  );
  const body = (await response.json()) as { tracks?: unknown; error?: string };
  if (!response.ok)
    throw new Error(body.error ?? "Die Jamendo-Suche ist fehlgeschlagen.");
  if (!Array.isArray(body.tracks))
    throw new Error("Jamendo hat unerwartet geantwortet.");
  return body.tracks.filter(isCatalogTrack);
}

export async function prepareJamendoTrack(
  track: JamendoCatalogTrack,
  signal: AbortSignal,
  report: ProgressReporter,
): Promise<PreparedAudioTrack> {
  report({
    stage: "fetching",
    fraction: 0,
    message: "Jamendo-Track wird geladen …",
  });
  const response = await fetch(`/api/rhythm/jamendo/audio/${track.id}`, {
    signal,
    headers: { Accept: "audio/*" },
  });
  const bytes = await readBoundedResponse(response, signal, report);
  const prepared = await decodeAndAnalyzeAudio(bytes, signal, report);
  return {
    metadata: {
      identity: {
        provider: "jamendo",
        providerTrackId: track.id,
        contentVersion: prepared.contentHash,
      },
      title: track.title,
      artist: track.artist,
      durationMs: Math.round(prepared.buffer.duration * 1000),
      attribution: {
        creator: track.artist,
        provider: "Jamendo",
        trackUrl: track.trackUrl,
        licenseName: track.licenseName,
        licenseUrl: track.licenseUrl,
        notice:
          "Track-spezifische CC-BY-Namensnennung. Zusätzlich gelten die Jamendo-API-Bedingungen; Rechte für öffentliche Aufführung und Synchronisation garantiert dieser Prototyp nicht.",
      },
    },
    capabilities: {
      ...JAMENDO_CAPABILITIES,
      playback: "decoded-buffer",
      analysis: "pcm",
      clock: "scheduled-web-audio",
    },
    buffer: prepared.buffer,
    analysis: prepared.analysis,
  };
}
