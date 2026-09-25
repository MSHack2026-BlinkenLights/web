// Optional real-browser smoke test. Requires agent-browser and a running dev server.
// Audio runs normally; instrumentation observes scheduling and injects interruption cases.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

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
  evaluate(`
    window.__rhythmTest = { contexts: [], starts: [], failResume: false, holdResume: false, releaseResume: null };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options) { super(options); window.__rhythmTest.contexts.push(this); }
      resume() {
        if (window.__rhythmTest.failResume) return Promise.reject(new Error('Simulated audio permission failure'));
        const resumed = super.resume();
        if (window.__rhythmTest.holdResume) return resumed.then(() => new Promise(resolve => { window.__rhythmTest.releaseResume = resolve; }));
        return resumed;
      }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (when) => {
          window.__rhythmTest.starts.push({ when, context: this, audible: source.buffer.getChannelData(0).some(sample => sample !== 0) });
          return start(when);
        };
        return source;
      }
    };
  `);
  click("Start demo");
  wait(phase("Count-in"));
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
    scheduledSources: 1,
    audible: true,
  });
  command(["press", "ArrowRight"]); // Real browser key delivery, not only synthetic events.
  evaluate(
    "window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }))",
  );
  wait(
    "document.querySelector('[data-lane=left]').getAttribute('aria-pressed') === 'false'",
  );
  click("Step up"); // Actual pointer input must release its held state too.
  wait(
    "document.querySelector('[data-lane=up]').getAttribute('aria-pressed') === 'false'",
  );
  command(["press", "Escape"]);
  wait(phase("Stopped"));
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

  evaluate(`
    const slider = document.querySelector('#alignment-delay');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '250');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  wait(
    "document.querySelector('#alignment-delay').getAttribute('aria-valuetext') === '250 milliseconds'",
  );
  click("Restart demo");
  wait(phase("Playing"));
  const alignment = evaluate(`(() => {
    const start = window.__rhythmTest.starts.at(-1);
    const raw = (start.context.currentTime - start.when - 2) * 1000;
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
  wait(phase("Finished"));
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

  click("Restart demo");
  wait(phase("Count-in"));
  evaluate("window.__rhythmTest.contexts.at(-1).suspend()");
  wait(phase("Stopped"));
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  click("Restart demo");
  wait(phase("Count-in"));
  evaluate("window.dispatchEvent(new Event('blur'))");
  wait(phase("Stopped"));
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  evaluate("window.__rhythmTest.failResume = true");
  click("Restart demo");
  wait(phase("Audio error"));
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  evaluate("window.__rhythmTest.failResume = false");
  click("Start demo");
  wait(phase("Count-in"));
  click("Stop");
  wait(phase("Stopped"));
  console.log(
    "PASS: audio interruption, focus loss, permission error, retry, Stop",
  );

  evaluate("window.__rhythmTest.holdResume = true");
  click("Restart demo");
  wait(phase("Preparing audio"));
  wait("typeof window.__rhythmTest.releaseResume === 'function'");
  click("Stop");
  wait(
    "window.__rhythmTest.contexts.every(context => context.state === 'closed')",
  );
  evaluate("window.__rhythmTest.holdResume = false");
  click("Restart demo");
  wait(phase("Count-in"));
  evaluate("window.__rhythmTest.releaseResume()");
  assert.equal(
    evaluate(
      "window.__rhythmTest.contexts.filter(context => context.state === 'running').length",
    ),
    1,
  );
  click("Stop");
  wait(phase("Stopped"));
  console.log("PASS: stop during pending startup and late-resume cancellation");

  command(["set", "viewport", "390", "844"]);
  assert.equal(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
  );
  command(["set", "viewport", "1440", "1100"]);
  click("Restart demo");
  wait(phase("Count-in"));
  command([
    "find",
    "role",
    "link",
    "click",
    "--name",
    "Back to map",
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
}
