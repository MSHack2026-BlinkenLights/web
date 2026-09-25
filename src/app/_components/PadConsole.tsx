"use client";

import { useEffect, useRef, useState } from "react";

import { subscribeToPadLog } from "wbl/services/pad-log";
import { type PadLogEntry, type PadLogLevel } from "wbl/types/pad";

interface PadConsoleProps {
  padId: string;
  /** Oldest lines are dropped once this many are buffered. */
  maxEntries?: number;
  className?: string;
}

const LEVEL_STYLES: Record<PadLogLevel, { tag: string; className: string }> = {
  info: { tag: "INFO", className: "text-neon-cyan" },
  warn: { tag: "WARN", className: "text-neon-yellow" },
  error: { tag: "ERR ", className: "text-neon-magenta" },
};

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Read-only console showing incoming log lines of a pad. */
export function PadConsole({
  padId,
  maxEntries = 500,
  className = "",
}: PadConsoleProps) {
  const [entries, setEntries] = useState<PadLogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (paused) return;
    return subscribeToPadLog(padId, (entry) =>
      setEntries((prev) => [...prev, entry].slice(-maxEntries)),
    );
  }, [padId, paused, maxEntries]);

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
      aria-labelledby="pad-console-title"
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 ${className}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1">
        <h2 id="pad-console-title" className="text-sm font-semibold">
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
        aria-label="Eingehende Meldungen"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
      >
        {entries.length === 0 ? (
          <p className="text-white/40">Warte auf Meldungen vom Spielfeld …</p>
        ) : (
          entries.map((entry) => {
            const level = LEVEL_STYLES[entry.level];
            return (
              <p key={entry.id} className="break-words whitespace-pre-wrap">
                <time
                  dateTime={entry.timestamp.toISOString()}
                  className="text-white/40"
                >
                  {timeFormat.format(entry.timestamp)}
                </time>{" "}
                <span className={level.className}>{level.tag}</span>{" "}
                <span className="text-white/90">{entry.message}</span>
              </p>
            );
          })
        )}
      </div>
    </section>
  );
}
