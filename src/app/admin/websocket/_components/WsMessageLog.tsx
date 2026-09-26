"use client";

import { useEffect, useRef, useState } from "react";

import { changeColor } from "wbl/app/admin/_components/change-color";
import { type RouterOutputs, api } from "wbl/trpc/react";

type WsLogEntry =
  RouterOutputs["admin"]["websocket"]["messages"]["entries"][number];

interface WsMessageLogProps {
  /** Oldest lines are dropped once this many are buffered. */
  maxEntries?: number;
  className?: string;
}

const POLL_MS = 500;

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
});

const PING_PAYLOADS = new Set(["ping", "pong"]);

/**
 * Live log of the messages controllers send and get over WebSocket, polled incrementally from
 * the server's buffer. `change` messages show a swatch of their color.
 *
 * @param props - Buffer size and extra classes.
 * @returns The console section.
 */
export function WsMessageLog({
  maxEntries = 500,
  className = "",
}: WsMessageLogProps) {
  const utils = api.useUtils();
  const connections = api.admin.websocket.connections.useQuery();
  const [entries, setEntries] = useState<WsLogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [connectionFilter, setConnectionFilter] = useState("");
  const [hidePings, setHidePings] = useState(false);
  const cursor = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    async function poll() {
      try {
        const result = await utils.admin.websocket.messages.fetch(
          { after: cursor.current },
          { staleTime: 0 },
        );
        if (cancelled) return;
        cursor.current = result.lastSeq;
        if (result.entries.length > 0) {
          setEntries((prev) => [...prev, ...result.entries].slice(-maxEntries));
        }
      } catch {
        // Try again on the next tick.
      }
    }
    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [paused, maxEntries, utils]);

  const visible = entries.filter(
    (entry) =>
      (!connectionFilter || entry.connectionId === connectionFilter) &&
      !(hidePings && PING_PAYLOADS.has(entry.payload)),
  );

  // Keep the newest line visible unless the user scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 16;
  }

  const controllerLabels = new Map(
    (connections.data ?? []).flatMap((connection) =>
      connection.controller
        ? [
            [
              connection.id,
              connection.controller.name ??
                `#${connection.controller.hardwareId}`,
            ] as const,
          ]
        : [],
    ),
  );
  const connectionIds = [
    ...new Set([
      ...(connections.data ?? []).map((connection) => connection.id),
      ...entries.map((entry) => entry.connectionId),
    ]),
  ].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

  return (
    <section
      aria-labelledby="ws-log-title"
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${className}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-1">
        <h2 id="ws-log-title" className="text-sm font-semibold">
          Nachrichten
          <span className="ml-2 font-normal text-white/50">
            {paused ? "pausiert" : "live"}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-1">
          <select
            value={connectionFilter}
            onChange={(event) => setConnectionFilter(event.target.value)}
            aria-label="Nach Verbindung filtern"
            className="bg-pixel-off min-h-10 rounded-lg border border-white/10 px-2 text-sm text-white"
          >
            <option value="">Alle Verbindungen</option>
            {connectionIds.map((id) => (
              <option key={id} value={id}>
                {id}
                {controllerLabels.has(id) && ` (${controllerLabels.get(id)})`}
              </option>
            ))}
          </select>
          <label className="flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10">
            <input
              type="checkbox"
              checked={hidePings}
              onChange={(event) => setHidePings(event.target.checked)}
            />
            Ping/Pong ausblenden
          </label>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            className="min-h-12 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10"
          >
            {paused ? "Fortsetzen" : "Pausieren"}
          </button>
          <button
            type="button"
            onClick={() => setEntries([])}
            className="min-h-12 rounded-lg px-3 text-sm text-white/80 hover:bg-white/10"
          >
            Leeren
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="off"
        aria-label="WebSocket-Nachrichten"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
      >
        {visible.length === 0 ? (
          <p className="text-white/40">Warte auf Nachrichten …</p>
        ) : (
          visible.map((entry) => {
            const controller = controllerLabels.get(entry.connectionId);
            const color = entry.binary ? null : changeColor(entry.payload);
            return (
              <p key={entry.seq} className="break-words whitespace-pre-wrap">
                <time
                  dateTime={entry.timestamp.toISOString()}
                  className="text-white/40"
                >
                  {timeFormat.format(entry.timestamp)}
                </time>{" "}
                <span
                  className={
                    entry.direction === "in"
                      ? "text-neon-cyan"
                      : "text-neon-magenta"
                  }
                >
                  {entry.direction === "in" ? "← von" : "→ an"}{" "}
                  {entry.connectionId}
                  {controller && ` (${controller})`}
                </span>{" "}
                {entry.binary && (
                  <span className="text-white/40">
                    [binär, {entry.size} B]{" "}
                  </span>
                )}
                <span className="text-white/90">{entry.payload}</span>
                {entry.truncated && (
                  <span className="text-white/40"> … ({entry.size} B)</span>
                )}
                {color && (
                  <span
                    aria-hidden
                    className="ml-2 inline-block size-3 rounded-sm border border-white/30 align-middle"
                    style={{ backgroundColor: color }}
                  />
                )}
              </p>
            );
          })
        )}
      </div>
    </section>
  );
}
