export type AudioProviderId = "generated" | "local" | "jamendo";

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 5 * 60;

export interface TrackIdentity {
  provider: AudioProviderId;
  providerTrackId: string;
  /** Changes when the exact bytes or generated-audio recipe change. */
  contentVersion: string;
}

export interface TrackAttribution {
  creator: string;
  provider: string;
  trackUrl?: string;
  licenseName: string;
  licenseUrl?: string;
  notice?: string;
}

export interface TrackMetadata {
  identity: TrackIdentity;
  title: string;
  artist: string;
  durationMs: number;
  attribution: TrackAttribution;
}

/**
 * Discovery, PCM access and clock quality are deliberately independent.
 * A future remote-transport provider must not be treated as decoded audio.
 */
export interface AudioCapabilities {
  discovery: "catalog" | "file-picker" | "built-in" | false;
  playback: "decoded-buffer" | "remote-transport" | false;
  analysis: "pcm" | "provider-beats" | false;
  clock: "scheduled-web-audio" | "approximate-position" | false;
}

export interface ProviderAvailability {
  available: boolean;
  reason?: string;
}

export interface BeatAnalysis {
  analyzerId: string;
  bpm: number;
  confidence: number;
  /** Absolute times relative to the first decoded audio sample. */
  beatTimestampsMs: readonly number[];
  warnings: readonly string[];
}

export interface PreparedAudioTrack {
  metadata: TrackMetadata;
  capabilities: AudioCapabilities & {
    playback: "decoded-buffer";
    analysis: "pcm";
    clock: "scheduled-web-audio";
  };
  buffer: AudioBuffer;
  analysis: BeatAnalysis;
}

export interface PreparationProgress {
  stage: "fetching" | "decoding" | "analyzing";
  fraction: number;
  message: string;
}

export type ProgressReporter = (progress: PreparationProgress) => void;

export const GENERATED_CAPABILITIES: AudioCapabilities = {
  discovery: "built-in",
  playback: "decoded-buffer",
  analysis: "pcm",
  clock: "scheduled-web-audio",
};

export const LOCAL_CAPABILITIES: AudioCapabilities = {
  discovery: "file-picker",
  playback: "decoded-buffer",
  analysis: "pcm",
  clock: "scheduled-web-audio",
};

export const JAMENDO_CAPABILITIES: AudioCapabilities = {
  discovery: "catalog",
  playback: "decoded-buffer",
  analysis: "pcm",
  clock: "scheduled-web-audio",
};

export function trackIdentityKey(identity: TrackIdentity) {
  return `${identity.provider}:${identity.providerTrackId}:${identity.contentVersion}`;
}
