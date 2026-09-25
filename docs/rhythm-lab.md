# Rhythm lab (phase 1)

Open `/rhythm-lab` with `npm run dev`. This is a browser-only, read-only-hardware prototype: no controller commands, network game protocol, database writes, or music-service integration.

## Try it

1. Use built-in or wired audio first; keep the volume comfortable.
2. Click **Start demo** to unlock browser audio. Listen to the four-beat count-in.
3. A directional panel brightens in cyan one beat before its target. Step when it turns white, on the beat. Green means a hit; red means a miss.
4. Use arrow keys, or press the simulated panels. Release before pressing again. The intended physical input is the floor board, not a separate screen of scrolling notes.
5. Stop / Escape ends playback. Restart begins a fresh run with a fresh score.

The original, generated 120 BPM track lasts 18 seconds plus a two-second count-in. It contains 16 isolated taps. The browser schedules the entire audio buffer in advance, including the count-in and note accents.

The board contains brightness changes and brief light pulses. They are gameplay cues rather than decorative animation. Stop if uncomfortable.

## Timing model

- `AudioContext.currentTime` is the authoritative rendering clock.
- The audio source is scheduled 150 ms ahead of the current context time. Song-zero is two seconds after that scheduled buffer start.
- Both the LED projection and input judgment use:

  ```text
  songMs = (audioContextTime − songStartTime) × 1000 − alignmentDelayMs
  ```

- A positive alignment delay moves LEDs **and scoring** later relative to the generated audio. It does not move the audio itself. Increase it if audio is heard after the lights; decrease it if heard before the lights. Stop before changing the offset or volume.
- `requestAnimationFrame` refreshes the UI; it does not accumulate time or schedule musical beats. Missing a frame cannot skip missed-note accounting.
- Input samples the audio clock in the event handler, not the previous rendered frame. Holding a key does not repeat a press.
- Perfect: absolute error ≤60 ms; good: ≤140 ms; otherwise a note expires as a miss. Wrong-lane and unmatched presses are counted as stray, without points. A note can be judged only once.
- The inherited `PixelGrid` color transition is disabled for this route, so it does not add a 300 ms fade to target/feedback flashes.

This clock is not a measurement of sound at the listener's ears. Output buffering, Bluetooth, display latency, and input delivery introduce additional delay. Calibration here is a manually chosen common visual/judgment offset, not automatic Bluetooth synchronization or independent sensor calibration. Physical output timing still needs a listening/measurement test.

## Lifecycle

A fresh audio context/source is created for each run:

```text
idle → preparing → count-in → playing → finished
            ↘ error         ↘ stopped
```

Audio interruption, tab hiding, and window focus loss stop the run rather than letting a throttled tab score unfair misses. Leaving the route stops/disconnects audio and cancels animation. Pending startup is invalidated on stop/restart/unmount, so a late `resume()` cannot resurrect an old run. There is deliberately no pause/resume or seek in phase 1.

## Code map

| File                                                   | Responsibility                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `src/lib/rhythm/engine.ts`                             | Types, layout, timeline conversion, pure note judging/expiration, board projection, scoring |
| `src/lib/rhythm/demo-chart.ts`                         | Authored chart, logical lanes independent of board coordinates                              |
| `src/lib/rhythm/audio.ts`                              | Generated PCM track, Web Audio scheduling and disposal                                      |
| `src/app/rhythm-lab/_components/use-rhythm-session.ts` | Browser lifecycle, input capture, shared clock, animation loop                              |
| `src/app/rhythm-lab/_components/rhythm-board.tsx`      | Simulator/input adapter using `PixelGrid`                                                   |
| `src/app/rhythm-lab/_components/rhythm-lab.tsx`        | Controls, calibration, developer readout                                                    |

## Checks

Node.js 22.19+ (24 recommended) can run the pure TypeScript engine using built-in type stripping, with no additional test-runner dependencies:

```bash
npm run test:rhythm
npm run check
```

Optional real Chromium smoke checks use an installed `agent-browser` CLI and its browser binary. Start the development server first:

```bash
npm run test:rhythm:browser
# Or target another local port:
RHYTHM_TEST_URL=http://localhost:3001 npm run test:rhythm:browser
```

The browser test uses its own named session, exercises real Web Audio scheduling, keyboard/pointer input, cleanup, calibration, and completion. It observes audio context/source lifetimes and injects permission/interruption cases. It does not verify physical sound or Bluetooth latency. Do not run `next build` in the same working tree while the dev server/browser checks are running: both use `.next`.

## Next steps (not implemented)

- Replace generated audio with licensed/local decoded audio plus a matching authored chart.
- Add a hardware adapter. Prefer preloaded timestamped cues with a controller-local scheduler over sending every color at its deadline.
- Establish browser/controller clock mapping, readiness acknowledgments, run IDs, source-timestamped panel input, calibration, and a disconnect policy.
- Integrate with the existing `Game` lifecycle only after the local timing experiment is validated; do not persist every display frame.
