"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { useLivePanels } from "wbl/app/_components/use-live-panels";
import { errorText } from "wbl/app/admin/_components/format";
import { api, type RouterOutputs } from "wbl/trpc/react";
import { currentCells, OFF_HEX } from "wbl/utils/cells";

type Game = RouterOutputs["admin"]["games"]["get"];
type Cell = Game["data"][number];

const OPTIMISTIC_PREFIX = "optimistic:";
let optimisticCount = 0;

const changeTime = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * Clickable LED grid to paint or turn off a game's cells, plus the history of
 * changes. Works on ended games too. Every click adds a change, shows up
 * immediately and is rolled back if the server rejects it.
 *
 * While the game runs, changes from the controller show up live, and painted
 * cells appear live in the preview on the website. They only reach the
 * physical panel while "An Panel senden" is on.
 *
 * @param props - The game with controller size and cells.
 * @returns The editor.
 */
export function PixelEditor({ game }: { game: Game }) {
  const utils = api.useUtils();
  const [color, setColor] = useState("#22e4ff");
  const [erasing, setErasing] = useState(false);
  const [sendToPanel, setSendToPanel] = useState(false);
  const query = { id: game.id };
  const running = !game.endedAt;

  // Refetching while clicks are still in flight would briefly bring back
  // old cells, so sync with the server only once the last change settled.
  const inFlight = useRef(0);
  const begin = async () => {
    inFlight.current += 1;
    await utils.admin.games.get.cancel(query);
    return utils.admin.games.get.getData(query)?.data ?? [];
  };
  const settle = () => {
    inFlight.current -= 1;
    if (inFlight.current === 0) void utils.admin.games.get.invalidate(query);
  };

  // Every live update may be a change the controller stored for this game.
  const live = useLivePanels(running ? game.controller.id : null);
  useEffect(() => {
    if (live && inFlight.current === 0) {
      void utils.admin.games.get.invalidate({ id: game.id });
    }
  }, [live, game.id, utils]);
  const writeCells = (update: (cells: Cell[]) => Cell[]) =>
    utils.admin.games.get.setData(query, (old) =>
      old ? { ...old, data: update(old.data) } : old,
    );

  const paint = async (x: number, y: number, colorHex: string) => {
    await begin();
    const id = `${OPTIMISTIC_PREFIX}${++optimisticCount}`;
    const change = {
      id,
      gameId: game.id,
      x,
      y,
      colorHex: colorHex.toUpperCase(),
      createdAt: new Date(),
    };
    writeCells((history) => [...history, change]);
    return { id };
  };
  const rollback = (id?: string) =>
    writeCells((history) => history.filter((change) => change.id !== id));

  const setPixel = api.admin.games.setPixel.useMutation({
    onMutate: ({ x, y, colorHex }) => paint(x, y, colorHex),
    onError: (_error, _input, context) => rollback(context?.id),
    onSettled: settle,
  });
  const turnOffPixel = api.admin.games.turnOffPixel.useMutation({
    onMutate: ({ x, y }) => paint(x, y, OFF_HEX),
    onError: (_error, _input, context) => rollback(context?.id),
    onSettled: settle,
  });
  const clear = api.admin.games.clearPixels.useMutation({
    onMutate: async () => {
      const previous = await begin();
      writeCells(() => []);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context) writeCells(() => context.previous);
    },
    onSettled: settle,
  });
  const error = setPixel.error ?? turnOffPixel.error ?? clear.error;

  const { width, height } = game.controller;
  const cells = currentCells(game.data);
  const newestFirst = [...game.data].reverse();

  const handleCell = (x: number, y: number) => {
    if (!erasing) {
      setPixel.mutate({ id: game.id, x, y, colorHex: color, sendToPanel });
    } else if (cells.has(`${x},${y}`)) {
      turnOffPixel.mutate({ id: game.id, x, y, sendToPanel });
    }
  };

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`flex min-h-12 items-center gap-2 rounded-full border px-4 text-sm ${erasing ? "border-white/20 text-white/60" : "border-neon-cyan/60 text-neon-cyan"}`}
          >
            <input
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                setErasing(false);
              }}
              className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            Malen
          </label>
          <Button
            variant="outline"
            tone={erasing ? "magenta" : "neutral"}
            icon="Erase"
            aria-pressed={erasing}
            onClick={() => setErasing((value) => !value)}
          >
            Ausschalten
          </Button>
          <Button
            variant="ghost"
            tone="magenta"
            icon="Trash"
            isPending={clear.isPending}
            disabled={game.data.length === 0}
            onClick={() => clear.mutate({ id: game.id, sendToPanel })}
          >
            Alle löschen
          </Button>
          {running && (
            <label className="flex min-h-12 items-center gap-2 rounded-full px-4 text-sm text-white/80 hover:bg-white/10">
              <input
                type="checkbox"
                checked={sendToPanel}
                onChange={(event) => setSendToPanel(event.target.checked)}
              />
              An Panel senden
            </label>
          )}
        </div>
        <div
          className="grid w-full"
          style={{
            gap: `${Math.min(4, 16 / width)}%`,
            gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            aspectRatio: `${width} / ${height}`,
          }}
        >
          {Array.from({ length: width * height }, (_, i) => {
            const x = i % width;
            const y = Math.floor(i / width);
            const cell = cells.get(`${x},${y}`);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleCell(x, y)}
                aria-label={`Pixel ${x}, ${y}${cell ? `: ${cell.colorHex}` : ", aus"}`}
                title={`${x}, ${y}`}
                className={`focus-visible:outline-neon-cyan aspect-square rounded-[18%] transition-[background-color,box-shadow] hover:ring-2 hover:ring-white/40 focus-visible:outline-2 ${
                  cell
                    ? "bg-(--pixel-color) shadow-[0_0_0.75rem_var(--pixel-color)]"
                    : "bg-pixel-off"
                }`}
                style={
                  cell
                    ? ({ "--pixel-color": cell.colorHex } as CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </div>
        <FormStatus
          error={
            error && `Nicht gespeichert, zurückgesetzt: ${errorText(error)}`
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/60">
          {cells.size} von {width * height} Pixeln an · {game.data.length}{" "}
          Änderungen
        </p>
        {newestFirst.length > 0 && (
          <ol className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-2xl border border-white/10 p-1">
            {newestFirst.map((change) => {
              const off = change.colorHex === OFF_HEX;
              return (
                <li
                  key={change.id}
                  className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm"
                >
                  <span
                    className={`size-4 shrink-0 rounded-[18%] ${off ? "bg-pixel-off border border-white/20" : ""}`}
                    style={
                      off ? undefined : { backgroundColor: change.colorHex }
                    }
                    aria-hidden
                  />
                  <span className="w-16 font-mono tabular-nums">
                    {change.x}, {change.y}
                  </span>
                  <span className="font-mono text-white/70">
                    {off ? "aus" : change.colorHex}
                  </span>
                  <span className="ml-auto text-xs text-white/40 tabular-nums">
                    {changeTime.format(change.createdAt)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
