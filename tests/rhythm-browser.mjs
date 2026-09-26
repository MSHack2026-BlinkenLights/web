// Optional real-browser smoke test. Requires agent-browser and a running dev server.
// Audio runs normally; instrumentation observes scheduling and injects interruption cases.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function writePulseWav(path) {
  const sampleRate = 22_050;
  const durationSeconds = 12;
  const sampleCount = sampleRate * durationSeconds;
  const wav = Buffer.alloc(44 + sampleCount * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + sampleCount * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(sampleCount * 2, 40);
  for (let index = 0; index < sampleCount; index++) {
    const withinBeat = (index / sampleRate) % 0.5;
    const sample =
      withinBeat < 0.08
        ? Math.sin(2 * Math.PI * 180 * withinBeat) *
          Math.exp(-withinBeat * 35) *
          0.8
        : 0;
    wav.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }
  writeFileSync(path, wav);
}

const fixturePath = join(tmpdir(), `rhythm-browser-${process.pid}.wav`);
const oversizedPath = join(tmpdir(), `rhythm-browser-${process.pid}.mp3`);
writePulseWav(fixturePath);
writeFileSync(oversizedPath, Buffer.alloc(20 * 1024 * 1024 + 1));

const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "rhythm-smoke"],
  { encoding: "utf8" },
).trim();
const url = new URL(
  "/rhythm-lab",
  process.env.RHYTHM_TEST_URL ?? "http://localhost:3000",
).href;
function command(args, input) {
  const result = JSON.parse(
    execFileSync("agent-browser", ["--session", session, "--json", ...args], {
      encoding: "utf8",
      input,
      timeout: 45_000,
    }),
  );
  assert.equal(result.success, true, JSON.stringify(result));
  return result.data;
}
const evaluate = (script) => command(["eval", "--stdin"], script).result;
const click = (name) =>
  command(["find", "role", "button", "click", "--name", name, "--exact"]);
const wait = (condition) => command(["wait", "--fn", condition]);
const phase = (value) =>
  `document.querySelector('[aria-labelledby="board-title"] [role="status"]').textContent === ${JSON.stringify(value)}`;

try {
  command(["open", url]);
  command(["set", "viewport", "1440", "1100"]);
  wait("!!document.querySelector('#alignment-delay')");
  evaluate(`(() => {
    window.__rhythmTest = { contexts: [], starts: [], failResume: false, holdResume: false, releaseResume: null };
    const prototype = window.AudioContext.prototype;
    const track = context => {
      if (!window.__rhythmTest.contexts.includes(context)) window.__rhythmTest.contexts.push(context);
    };
    const nativeResume = prototype.resume;
    prototype.resume = function () {
      track(this);
      if (window.__rhythmTest.failResume) return Promise.reject(new Error('Simulated audio permission failure'));
      const resumed = nativeResume.call(this);
      if (window.__rhythmTest.holdResume) return resumed.then(() => new Promise(resolve => { window.__rhythmTest.releaseResume = resolve; }));
      return resumed;
    };
    const nativeDecode = prototype.decodeAudioData;
    prototype.decodeAudioData = function (...args) {
      track(this);
      return nativeDecode.apply(this, args);
    };
    const nativeCreateSource = prototype.createBufferSource;
    prototype.createBufferSource = function () {
      track(this);
      const source = nativeCreateSource.call(this);
      const start = source.start.bind(source);
      source.start = when => {
        window.__rhythmTest.starts.push({ when, context: this, audible: source.buffer.getChannelData(0).some(sample => sample !== 0) });
        return start(when);
      };
      return source;
    };
  })()`);
  click("Demo starten");
  wait(phase("Einzählen"));
  assert.equal(
    evaluate("document.querySelector('#alignment-delay').disabled"),
    true,
  );
  const hit = evaluate(`(async () => {
    const start = performance.now();
    const time = () => Number(document.querySelector('[data-song-ms]').dataset.songMs);
    while (time() < 995 && performance.now() - start < 6000) await new Promise(resolve => setTimeout(resolve, 2));
    if (time() > 1120 || time() < 995) throw new Error('Missed input test window: time=' + time() + ', phase=' + document.querySelector('[aria-labelledby="board-title"] [role="status"]').textContent);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true, bubbles: true }));
    await new Promise(resolve => requestAnimationFrame(resolve));
    return {
      hits: Number(document.querySelector('[data-stat="perfect"]').textContent) + Number(document.querySelector('[data-stat="good"]').textContent),
      held: document.querySelector('[data-lane="left"]').getAttribute('aria-pressed'),
      stray: Number(document.querySelector('[data-stat="stray"]').textContent),
      scheduledSources: window.__rhythmTest.starts.length,
      audible: window.__rhythmTest.starts[0].audible
    };
  })()`);
  assert.deepEqual(hit, {
    hits: 1,
    held: "true",
    stray: 0,
    scheduledSources: 2,
    audible: true,
  });
  command(["press", "ArrowRight"]); // Real browser key delivery, not only synthetic events.
  evaluate(
    "window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }))",
  );
  wait(
    "document.querySelector('[data-lane=left]').getAttribute('aria-pressed') === 'false'",
  );
  click("Schritt nach oben"); // Actual pointer input must release its held state too.
  wait(
    "document.querySelector('[data-lane=up]').getAttribute('aria-pressed') === 'false'",
  );
  command(["press", "Escape"]);
  wait(phase("Gestoppt"));
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  assert.equal(
    evaluate("document.querySelector('#alignment-delay').disabled"),
    false,
  );
  console.log(
    "PASS: generated audio, scheduled count-in, hit scoring, key repeat, keyboard/pointer releases, Escape, cleanup",
  );

  command(["upload", "input[type=file]", fixturePath]);
  wait("!!document.querySelector('[aria-labelledby=analysis-title]')");
  assert.equal(
    evaluate(
      "document.querySelector('[aria-labelledby=track-title] h2').textContent",
    ),
    "rhythm-browser-" + process.pid,
  );
  assert.ok(
    evaluate(
      "Number(document.querySelector('[aria-labelledby=track-title]').textContent.match(/(\\d+) einzelne Schritte/)[1])",
    ) > 0,
  );
  click("Track neu starten");
  wait(phase("Einzählen"));
  assert.equal(evaluate("window.__rhythmTest.starts.length"), 4);
  click("Stopp");
  wait(phase("Gestoppt"));
  click("Erzeugte Demo");
  wait(
    "document.querySelector('[aria-labelledby=track-title] h2').textContent === 'Erste Schritte'",
  );
  assert.equal(
    evaluate("!!document.querySelector('[aria-labelledby=analysis-title]')"),
    false,
  );
  console.log(
    "PASS: local file decode, worker analysis, generated chart, scheduled playback, source switching",
  );

  command(["upload", "input[type=file]", oversizedPath]);
  wait("document.body.textContent.includes('höchstens 20 MB')");
  assert.equal(
    evaluate(
      "document.querySelector('[aria-labelledby=track-title] h2').textContent",
    ),
    "Erste Schritte",
  );
  evaluate(`
    window.__nativeFileArrayBuffer = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      return new Promise((resolve, reject) => setTimeout(() => window.__nativeFileArrayBuffer.call(this).then(resolve, reject), 500));
    };
  `);
  command(["upload", "input[type=file]", fixturePath]);
  wait("document.body.textContent.includes('Vorbereitung abbrechen')");
  click("Erzeugte Demo");
  wait(
    "document.querySelector('[aria-labelledby=track-title] h2').textContent === 'Erste Schritte'",
  );
  evaluate("File.prototype.arrayBuffer = window.__nativeFileArrayBuffer");
  command(["wait", "700"]);
  assert.equal(
    evaluate("!!document.querySelector('[aria-labelledby=analysis-title]')"),
    false,
  );
  console.log(
    "PASS: local size rejection and source-switch preparation cancellation",
  );

  evaluate(`
    const slider = document.querySelector('#alignment-delay');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '250');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  wait(
    "document.querySelector('#alignment-delay').getAttribute('aria-valuetext') === '250 Millisekunden'",
  );
  click("Demo neu starten");
  wait(phase("Läuft"));
  const alignment = evaluate(`(() => {
    const start = window.__rhythmTest.starts.at(-1);
    const raw = (start.context.currentTime - start.when) * 1000;
    return raw - Number(document.querySelector('[data-song-ms]').dataset.songMs);
  })()`);
  assert.ok(
    Math.abs(alignment - 250) < 80,
    `Expected ~250ms alignment, got ${alignment}`,
  );
  assert.equal(
    evaluate("document.querySelector('[data-stat=perfect]').textContent"),
    "0",
  );
  wait(phase("Geschafft"));
  assert.equal(
    evaluate("document.querySelector('[data-stat=miss]').textContent"),
    "16",
  );
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  console.log(
    "PASS: calibration sign, restart resets score, full run completion and missed-note accounting",
  );

  click("Demo neu starten");
  wait(phase("Einzählen"));
  evaluate("window.__rhythmTest.contexts.at(-1).suspend()");
  wait(phase("Gestoppt"));
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  click("Demo neu starten");
  wait(phase("Einzählen"));
  evaluate("window.dispatchEvent(new Event('blur'))");
  wait(phase("Gestoppt"));
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  evaluate("window.__rhythmTest.failResume = true");
  click("Demo neu starten");
  wait(phase("Audiofehler"));
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  evaluate("window.__rhythmTest.failResume = false");
  click("Demo starten");
  wait(phase("Einzählen"));
  click("Stopp");
  wait(phase("Gestoppt"));
  console.log(
    "PASS: audio interruption, focus loss, permission error, retry, Stop",
  );

  evaluate("window.__rhythmTest.holdResume = true");
  click("Demo neu starten");
  wait(phase("Audio lädt"));
  wait("typeof window.__rhythmTest.releaseResume === 'function'");
  click("Stopp");
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  evaluate("window.__rhythmTest.holdResume = false");
  click("Demo neu starten");
  wait(phase("Einzählen"));
  evaluate("window.__rhythmTest.releaseResume()");
  assert.equal(
    evaluate(
      "window.__rhythmTest.contexts.filter(context => context.state === 'running').length",
    ),
    1,
  );
  click("Stopp");
  wait(phase("Gestoppt"));
  console.log("PASS: stop during pending startup and late-resume cancellation");

  command(["set", "viewport", "390", "844"]);
  assert.equal(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  command(["set", "viewport", "1440", "1100"]);
  click("Demo neu starten");
  wait(phase("Einzählen"));
  command([
    "find",
    "role",
    "link",
    "click",
    "--name",
    "Zurück zur Karte",
    "--exact",
  ]);
  wait("location.pathname === '/live'");
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  console.log("PASS: narrow layout, navigation cleanup");
  console.log(
    "Rhythm browser smoke tests passed. Physical audio latency still requires a listening/calibration test.",
  );
} finally {
  command(["close"]);
  rmSync(fixturePath, { force: true });
  rmSync(oversizedPath, { force: true });
}
