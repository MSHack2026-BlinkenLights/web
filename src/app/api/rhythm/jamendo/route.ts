import { NextResponse } from "next/server";

import { env } from "wbl/env";
import { parseJamendoTracks } from "wbl/lib/rhythm/jamendo";

const JAMENDO_TRACKS_URL = "https://api.jamendo.com/v3.0/tracks/";

function badGateway(error: string) {
  return NextResponse.json({ error }, { status: 502 });
}

export async function GET(request: Request) {
  if (!env.JAMENDO_CLIENT_ID)
    return NextResponse.json(
      { error: "Jamendo ist auf diesem Server nicht eingerichtet." },
      { status: 503 },
    );

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80)
    return NextResponse.json(
      { error: "Gib zwischen 2 und 80 Zeichen ein." },
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
      return badGateway(
        `Jamendo-Katalog nicht erreichbar (${response.status}).`,
      );
    const tracks = parseJamendoTracks(await response.json()).map(
      ({ audioUrl: _audioUrl, ...track }) => track,
    );
    return NextResponse.json(
      { tracks },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return badGateway(
      error instanceof Error
        ? error.message
        : "Die Jamendo-Suche ist fehlgeschlagen.",
    );
  }
}
