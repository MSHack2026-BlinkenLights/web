import { NextResponse } from "next/server";

import { env } from "wbl/env";
import { parseJamendoTracks } from "wbl/lib/rhythm/jamendo";

const JAMENDO_TRACKS_URL = "https://api.jamendo.com/v3.0/tracks/";

export async function GET(request: Request) {
  if (!env.JAMENDO_CLIENT_ID)
    return NextResponse.json(
      { error: "Jamendo is not configured on this server." },
      { status: 503 },
    );

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80)
    return NextResponse.json(
      { error: "Enter between 2 and 80 search characters." },
      { status: 400 },
    );

  const url = new URL(JAMENDO_TRACKS_URL);
  url.search = new URLSearchParams({
    client_id: env.JAMENDO_CLIENT_ID,
    format: "json",
    limit: "12",
    search: query,
    include: "licenses",
    audioformat: "mp31",
    durationbetween: "5_300",
  }).toString();

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(`Jamendo catalog request failed (${response.status}).`);
    const tracks = parseJamendoTracks(await response.json()).map(
      ({ audioUrl: _audioUrl, ...track }) => track,
    );
    return NextResponse.json(
      { tracks },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Jamendo catalog search failed.",
      },
      { status: 502 },
    );
  }
}
