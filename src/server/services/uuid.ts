import { randomBytes } from "node:crypto";

const COUNTER_MAX = 0xfff;

interface UuidV7State {
  lastMs: number;
  counter: number;
}

// Shared by all module graphs of the process, so IDs stay monotonic across them.
const globalForUuid = globalThis as unknown as { uuidV7State?: UuidV7State };
const state = (globalForUuid.uuidV7State ??= { lastMs: 0, counter: 0 });

/**
 * Creates a UUIDv7 that sorts after every ID this process created before.
 *
 * UUIDv7 only carries milliseconds, so IDs from the same millisecond would
 * otherwise sort randomly. The 12 bits after the version hold a counter
 * (RFC 9562, method 1); if it runs out, the timestamp moves ahead by one
 * millisecond.
 *
 * @returns The ID and the moment it encodes, to store as `createdAt`.
 */
export function createUuidV7() {
  const now = Date.now();
  if (now > state.lastMs) {
    state.lastMs = now;
    // Start low so a burst within one millisecond has room to count up.
    state.counter = randomBytes(1)[0]!;
  } else if (state.counter < COUNTER_MAX) {
    state.counter += 1;
  } else {
    state.lastMs += 1;
    state.counter = 0;
  }

  const random = randomBytes(8);
  random[0] = (random[0]! & 0x3f) | 0x80;
  const hex =
    state.lastMs.toString(16).padStart(12, "0") +
    "7" +
    state.counter.toString(16).padStart(3, "0") +
    random.toString("hex");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return { id, createdAt: new Date(state.lastMs) };
}
