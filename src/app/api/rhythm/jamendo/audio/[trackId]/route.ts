import { NextResponse } from "next/server";

import { env } from "wbl/env";
import {
  isAllowedJamendoMediaUrl,
  parseJamendoTracks,
} from "wbl/lib/rhythm/jamendo";
import { MAX_AUDIO_BYTES } from "wbl/lib/rhythm/source";

const JAMENDO_TRACKS_URL = "https://api.jamendo.com/v3.0/tracks/";

async function fetchAllowedMedia(initialUrl: string) {
  let url = initialUrl;
  for (let redirect = 0; redirect <= 3; redirect++) {
    if (!isAllowedJamendoMediaUrl(url))
      throw new Error("Jamendo returned an untrusted media location.");
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3)
        throw new Error("Jamendo media redirected too many times.");
      url = new URL(location, url).href;
      continue;
    }
    return response;
  }
  throw new Error("Jamendo media could not be loaded.");
}

async function readBounded(response: Response) {
  if (!response.ok)
    throw new Error(`Jamendo media request failed (${response.status}).`);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES)
    throw new Error("Jamendo media exceeded the 20 MB limit.");
  if (!response.body) return new Uint8Array(await response.arrayBuffer());

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_AUDIO_BYTES) {
      await reader.cancel();
      throw new Error("Jamendo media exceeded the 20 MB limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ trackId: string }> },
) {
  if (!env.JAMENDO_CLIENT_ID)
    return NextResponse.json(
      { error: "Jamendo is not configured on this server." },
      { status: 503 },
    );
  const { trackId } = await context.params;
  if (!/^\d{1,20}$/.test(trackId))
    return NextResponse.json({ error: "Invalid track id." }, { status: 400 });

  const apiUrl = new URL(JAMENDO_TRACKS_URL);
  apiUrl.search = new URLSearchParams({
    client_id: env.JAMENDO_CLIENT_ID,
    format: "json",
    id: trackId,
    limit: "1",
    include: "licenses",
    audioformat: "mp31",
  }).toString();

  try {
    const catalogResponse = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!catalogResponse.ok)
      throw new Error(
        `Jamendo catalog request failed (${catalogResponse.status}).`,
      );
    const track = parseJamendoTracks(await catalogResponse.json(), {
      requireAudio: true,
    }).find((candidate) => candidate.id === trackId);
    if (!track)
      return NextResponse.json(
        { error: "This track is unavailable or is not explicitly CC BY." },
        { status: 404 },
      );

    const mediaResponse = await fetchAllowedMedia(track.audioUrl);
    const bytes = await readBounded(mediaResponse);
    return new Response(bytes, {
      headers: {
        "Content-Type":
          mediaResponse.headers.get("content-type") ?? "audio/mpeg",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Jamendo media load failed.",
      },
      { status: 502 },
    );
  }
}
