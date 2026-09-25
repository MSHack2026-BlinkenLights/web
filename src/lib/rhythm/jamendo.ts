export interface JamendoCatalogTrack {
  id: string;
  title: string;
  artist: string;
  durationMs: number;
  trackUrl: string;
  licenseUrl: string;
  licenseName: string;
}

interface JamendoTrackWithAudio extends JamendoCatalogTrack {
  audioUrl: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function nonemptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isJamendoPageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      (url.hostname === "jamendo.com" ||
        url.hostname.endsWith(".jamendo.com")) &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

export function parseCcByLicense(value: unknown) {
  const url = nonemptyString(value);
  if (!url) return null;
  const match =
    /^https?:\/\/creativecommons\.org\/licenses\/by\/(2\.0|2\.5|3\.0|4\.0)\/?$/i.exec(
      url,
    );
  if (!match) return null;
  return {
    url: `https://creativecommons.org/licenses/by/${match[1]}/`,
    name: `CC BY ${match[1]}`,
  };
}

export function parseJamendoTracks(
  payload: unknown,
  options: { requireAudio?: boolean } = {},
): JamendoTrackWithAudio[] {
  const root = record(payload);
  const results = root?.results;
  if (!Array.isArray(results))
    throw new Error("Jamendo returned an unexpected response.");

  return results.flatMap((value) => {
    const item = record(value);
    if (!item) return [];
    const id = nonemptyString(item.id);
    const title = nonemptyString(item.name);
    const artist = nonemptyString(item.artist_name);
    const trackUrl = nonemptyString(item.shareurl);
    const audioUrl = nonemptyString(item.audio);
    const duration =
      typeof item.duration === "number"
        ? item.duration
        : Number.parseFloat(String(item.duration));
    const license = parseCcByLicense(item.license_ccurl);
    if (
      !id ||
      !/^\d+$/.test(id) ||
      !title ||
      !artist ||
      !trackUrl ||
      !isJamendoPageUrl(trackUrl) ||
      !license ||
      !Number.isFinite(duration) ||
      duration < 5 ||
      duration > 300 ||
      (options.requireAudio && !audioUrl)
    )
      return [];
    return [
      {
        id,
        title,
        artist,
        durationMs: Math.round(duration * 1000),
        trackUrl,
        licenseUrl: license.url,
        licenseName: license.name,
        audioUrl: audioUrl ?? "",
      },
    ];
  });
}

export function isAllowedJamendoMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      (url.hostname === "jamendo.com" ||
        url.hostname.endsWith(".jamendo.com")) &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}
