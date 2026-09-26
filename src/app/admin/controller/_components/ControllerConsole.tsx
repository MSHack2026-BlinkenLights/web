"use client";

import { useEffect, useRef, useState } from "react";

import { changeColor } from "wbl/app/admin/_components/change-color";
import { type RouterOutputs, api } from "wbl/trpc/react";

type WsLogEntry =
  RouterOutputs["admin"]["websocket"]["messages"]["entries"][number];

interface ControllerConsoleProps {
  controllerId: string;
  /** Oldest lines are dropped once this many are buffered. */
  maxEntries?: number;
  className?: string;
}

const POLL_MS = 500;

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * Read-only console with the messages a controller sent over WebSocket, polled incrementally
 * from the server's buffer. `change` messages show a swatch of their color.
 *
 * @param props - The controller, buffer size and extra classes.
 * @returns The console section.
 */
export function ControllerConsole({
  controllerId,
  maxEntries = 500,
  className = "",
}: ControllerConsoleProps) {
  const utils = api.useUtils();
  const [entries, setEntries] = useState<WsLogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const cursor = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;
    async function poll() {
      try {
        const result = await utils.admin.websocket.messages.fetch(
          { after: cursor.current, controllerId },
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
  }, [controllerId, paused, maxEntries, utils]);

  // Keep the newest line visible unless the user scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [entries]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 16;
  }

  return (
    <section
      aria-labelledby="controller-console-title"
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${className}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1">
        <h2 id="controller-console-title" className="text-sm font-semibold">
          Konsole
          <span className="ml-2 font-normal text-white/50">
            {paused ? "pausiert" : "live"}
          </span>
        </h2>
        <div className="flex gap-1">
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
        aria-label="Eingehende Nachrichten"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
      >
        {entries.length === 0 ? (
          <p className="text-white/40">
            Warte auf Nachrichten vom Controller …
          </p>
        ) : (
          entries.map((entry) => {
            const color = entry.binary ? null : changeColor(entry.payload);
            return (
              <p key={entry.seq} className="break-words whitespace-pre-wrap">
                <time
                  dateTime={entry.timestamp.toISOString()}
                  className="text-white/40"
                >
                  {timeFormat.format(entry.timestamp)}
                </time>{" "}
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
