import { padLogEntrySchema, type PadLogEntry } from "wbl/types/pad";

/**
 * Service layer for a pad's incoming log stream.
 *
 * The hardware interface is not defined yet, so this emits mock messages.
 * Replace the body of `subscribeToPadLog` with the real transport
 * (e.g. a tRPC subscription, SSE or WebSocket) – components only depend on
 * this function and its unsubscribe contract.
 */

type Unsubscribe = () => void;

export function subscribeToPadLog(
  padId: string,
  onEntry: (entry: PadLogEntry) => void,
): Unsubscribe {
  let counter = 0;

  const interval = setInterval(() => {
    const raw = createMockEntry(padId, counter++);
    // Validate like a real network message before handing it to the UI.
    const parsed = padLogEntrySchema.safeParse(raw);
    if (parsed.success) onEntry(parsed.data);
  }, 800);

  return () => clearInterval(interval);
}

const MOCK_MESSAGES = [
  { level: "info", message: "Touch erkannt: Zelle ({x}, {y})" },
  { level: "info", message: "Frame gerendert in {ms} ms" },
  { level: "info", message: "Heartbeat ok" },
  { level: "warn", message: "Sensor ({x}, {y}): Druckwert schwankt" },
  { level: "warn", message: "Latenz erhöht: {ms} ms" },
  { level: "error", message: "Verbindung kurz unterbrochen, neuer Versuch …" },
] as const;

function createMockEntry(padId: string, counter: number): unknown {
  const template =
    MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)] ??
    MOCK_MESSAGES[0];
  const message = template.message
    .replace("{x}", String(Math.floor(Math.random() * 3)))
    .replace("{y}", String(Math.floor(Math.random() * 3)))
    .replace("{ms}", String(5 + Math.floor(Math.random() * 60)));

  return {
    id: `${padId}-${Date.now()}-${counter}`,
    padId,
    timestamp: new Date().toISOString(),
    level: template.level,
    message,
  };
}
