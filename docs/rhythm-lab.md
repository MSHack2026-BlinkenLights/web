# Rhythm lab: flexible audio prototype

Open `/rhythm-lab` with `npm run dev`. This remains a browser-only, read-only-hardware prototype: no controller commands, network game protocol, database writes, or score persistence.

## Try it

### Generated demo (recommended first)

1. Use built-in or wired audio and keep the volume comfortable.
2. Leave **Erzeugte Demo** selected and click **Demo starten**.
3. Listen to the four-beat count-in. A panel brightens in cyan before its target; step when it turns white. Green means a hit and red means a miss.
4. Use arrow keys or the simulated panels, releasing between steps. Stop / Escape ends playback.

The original generated 120 BPM track is always available offline, lasts 18 seconds plus count-in, and contains 16 isolated taps.

### Local audio

Choose an MP3, WAV, M4A/AAC, OGG, or WebM file that you are authorized to play and synchronize. The browser:

1. validates a 20 MB / 5 minute limit;
2. reads and decodes the complete file in memory (it is not uploaded);
3. downsamples a mono analysis copy;
4. runs the replaceable energy/onset analyzer in a Web Worker; and
5. creates a deterministic, safely spaced tap chart bound to the SHA-256 hash of those exact audio bytes.

The fallback analyzer is deliberately labeled as a simple energy-grid estimate, not as Essentia-quality analysis. Preview the BPM, confidence, first chart targets and lanes before playing. Use 0.5x / 1x / 2x interpretation for half/double-tempo errors and the ±10/±50 ms chart controls for phase errors. These controls move chart targets; they never change audio playback speed.

Local-file rights are not verified by the app. The operator is responsible for copyright, synchronization, and public-performance permission.

### Optional Jamendo catalog

Set a **server-only** Jamendo developer client id and restart the server:

```dotenv
JAMENDO_CLIENT_ID="your_client_id"
```

Obtain the value from the [Jamendo Developer Portal](https://devportal.jamendo.com/). Do not use a `NEXT_PUBLIC_` variable. Without it, the UI clearly reports the catalog as unavailable and generated/local audio continue to work.

Search results are restricted to an explicit [Creative Commons Attribution (CC BY)](https://creativecommons.org/licenses/by/4.0/) URL. Each result and selected track show the artist, Jamendo track link, and exact returned license. Selection re-fetches metadata by numeric track id, follows at most three redirects only within strict HTTPS `jamendo.com` hosts, enforces the media limit, and returns `Cache-Control: no-store`. It is not an arbitrary URL proxy and does not build an offline catalog.

The selected track is fetched once into browser memory, completely decoded, hashed, analyzed and scheduled like a local file. Jamendo's free API is for genuinely noncommercial use and its [API terms](https://devportal.jamendo.com/api_terms_of_use) require artist/Jamendo attribution and backlinks. A track's Creative Commons license and API access do **not** by themselves guarantee synchronization or public-performance permission for an event or future product. Review those rights for the actual use.

Live Jamendo search/media/CORS was not verified during implementation because no client id was available. The parser, CC BY filtering and media-host policy use fixtures; the local route was verified to return an explicit unconfigured response. Test the complete provider path with the project's own credential before the event.

## Analysis and licensing decision

[Essentia.js](https://mtg.github.io/essentia.js/) exposes `RhythmExtractor2013`, but its published source carries the GNU AGPL v3-or-later license; Essentia also offers separate commercial licensing. It is **not shipped in this prototype** because project compatibility is an explicit licensing decision for the maintainers, not an assumption for this change. `BeatAnalysis` and chart generation are provider-neutral so a reviewed Essentia worker or another analyzer can replace the fallback later.

Spotify is not integrated. Spotify's developer policies restrict games and synchronization, and remote playback position is not decoded PCM on the scheduled Web Audio clock used here. The capability model intentionally distinguishes `remote-transport` / `approximate-position` from `decoded-buffer` / `scheduled-web-audio`; a future authorized remote provider cannot silently claim scored-play compatibility.

## Timing model

- Every run creates a fresh `AudioContext`, gain node, count-in source and song source.
- Real tracks are completely prepared before Start. `AudioBufferSourceNode.start()` schedules count-in and song from one origin, 150 ms ahead of `AudioContext.currentTime`.
- Song-zero is after a four-beat count-in calculated from the interpreted chart BPM. It does not trim or shift the decoded file.
- Both LED projection and input judgment use:

  ```text
  songMs = (audioContextTime − songStartTime) × 1000 − alignmentDelayMs
  ```

- A positive output alignment delay moves LEDs **and scoring** later relative to audio. It is separate from chart offset. Stop before changing either setting or volume.
- `requestAnimationFrame` projects state only. Input samples the audio clock in the event handler and skipped frames cannot skip missed-note accounting.
- Perfect: absolute error ≤60 ms; good: ≤140 ms. Wrong-lane/unmatched presses are stray. A note is judged once.
- Chart generation skips dense beat candidates. Current cues never overlap: selected targets have at least approach + judgment + feedback spacing.

This clock is not a measurement at the listener's ears. Output buffering, Bluetooth, display latency, and input delivery still need physical calibration. Browser tests do not establish Bluetooth or floor-controller synchronization.

## Lifecycle and cancellation

Gameplay follows:

```text
idle → preparing → count-in → playing → finished
            ↘ error         ↘ stopped
```

Audio-source preparation separately exposes fetching, decoding and analyzing progress. It is cancellable; choosing another source invalidates the old request. Bounded response reading aborts if the actual bytes exceed the advertised limit. Decoding itself is not browser-cancellable, but stale results are discarded and its temporary context is closed.

Audio interruption, tab hiding and window focus loss stop gameplay. Leaving the route disconnects sources and closes contexts. Stop/restart invalidates pending startup so a late `resume()` cannot resurrect an old run. There is no pause/resume or seek.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/lib/rhythm/source.ts` | Provider-neutral identity, attribution, capability, prepared-audio and analysis contracts |
| `src/lib/rhythm/local-source.ts` | Local-file adapter |
| `src/lib/rhythm/jamendo.ts` | Pure Jamendo response/license/host validation |
| `src/lib/rhythm/jamendo-source.ts` | Browser search and in-memory Jamendo preparation adapter |
| `src/app/api/rhythm/jamendo/**` | Fixed Jamendo API calls and strict track-id media endpoint; client id stays server-side |
| `src/lib/rhythm/prepare-audio.ts` | Bounded fetch, full decode, SHA-256 identity, downmix, worker lifecycle and cancellation |
| `src/lib/rhythm/beat-analyzer-core.ts` | Deterministic fallback energy/onset analysis |
| `src/lib/rhythm/beat-analysis-worker.ts` | Worker boundary |
| `src/lib/rhythm/chart-generator.ts` | Tempo/phase correction and deterministic safe chart generation from absolute beat timestamps |
| `src/lib/rhythm/engine.ts` | Timeline, judging, board projection and score |
| `src/lib/rhythm/audio.ts` | Generated PCM and common count-in/song scheduling/disposal |
| `src/app/rhythm-lab/_components/use-rhythm-session.ts` | Gameplay lifecycle, shared clock, input and animation |
| `src/app/rhythm-lab/_components/rhythm-lab.tsx` | Source selection, credits, preparation, correction, playback and score UI |

A chart stores `sourceIdentity` made from provider id, provider track id and content version/hash. Catalog metadata alone is never treated as exact content identity.

## Checks

```bash
npm run test:rhythm
npm run check
```

Optional real Chromium checks require `agent-browser` and a separately running development server:

```bash
PORT=3001 APP_PORT=3001 npm run dev
RHYTHM_TEST_URL=http://localhost:3001 npm run test:rhythm:browser
```

The browser suite exercises generated and local decoded audio, worker analysis, chart generation, scheduled count-in/song playback, scoring, source switching, interruption/error paths, pending-start cancellation, cleanup and narrow layout. Provider fixtures exercise CC BY filtering and media URL validation. Do not run `next build` concurrently with the development server in this worktree because both use `.next`.

## Not implemented

- Physical controller protocol or controller/browser clock mapping
- Independent output/input latency measurement
- Four-tap phase capture (the operator can currently use explicit offset buttons)
- A licensed Essentia build or equivalent production beat tracker
- Jamendo production credentials or verified event rights
- Spotify playback, stream capture, DRM bypass, or a fake sample-accurate remote clock
- Persistent/offline third-party media caching
