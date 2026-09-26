"use client";

import { type CSSProperties, useRef, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { errorText, formatDateTime } from "wbl/app/admin/_components/format";
import { api, type RouterOutputs } from "wbl/trpc/react";

type Game = RouterOutputs["admin"]["games"]["get"];
type Cell = Game["data"][number];

const OPTIMISTIC_PREFIX = "optimistic:";

function withCell(cells: Cell[], x: number, y: number, next: Cell | null) {
  const rest = cells.filter((cell) => cell.x !== x || cell.y !== y);
  if (next) rest.push(next);
  return rest.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Clickable LED grid to paint or erase a game's cells, plus the raw rows.
 * Works on ended games too. Changes show up immediately and are rolled back
 * cell by cell if the server rejects them.
 *
 * @param props - The game with controller size and cells.
 * @returns The editor.
 */
export function PixelEditor({ game }: { game: Game }) {
  const utils = api.useUtils();
  const [color, setColor] = useState("#22e4ff");
  const [erasing, setErasing] = useState(false);
  const query = { id: game.id };

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
  const writeCells = (update: (cells: Cell[]) => Cell[]) =>
    utils.admin.games.get.setData(query, (old) =>
      old ? { ...old, data: update(old.data) } : old,
    );

  const paint = async (x: number, y: number, next: Cell | null) => {
    const cells = await begin();
    const previous = cells.find((cell) => cell.x === x && cell.y === y) ?? null;
    writeCells((current) => withCell(current, x, y, next));
    return { previous };
  };
  const rollback = (x: number, y: number, previous?: Cell | null) =>
    writeCells((current) => withCell(current, x, y, previous ?? null));

  const setPixel = api.admin.games.setPixel.useMutation({
    onMutate: ({ x, y, colorHex }) =>
      paint(x, y, {
        id: `${OPTIMISTIC_PREFIX}${x},${y}`,
        gameId: game.id,
        x,
        y,
        colorHex: colorHex.toUpperCase(),
        createdAt: new Date(),
      }),
    onError: (_error, { x, y }, context) => rollback(x, y, context?.previous),
    onSettled: settle,
  });
  const deletePixel = api.admin.games.deletePixel.useMutation({
    onMutate: ({ x, y }) => paint(x, y, null),
    onError: (_error, { x, y }, context) => rollback(x, y, context?.previous),
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
  const error = setPixel.error ?? deletePixel.error ?? clear.error;

  const { width, height } = game.controller;
  const cells = new Map(game.data.map((cell) => [`${cell.x},${cell.y}`, cell]));

  const handleCell = (x: number, y: number) => {
    if (erasing) deletePixel.mutate({ id: game.id, x, y });
    else setPixel.mutate({ id: game.id, x, y, colorHex: color });
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
            Radieren
          </Button>
          <Button
            variant="ghost"
            tone="magenta"
            icon="Trash"
            isPending={clear.isPending}
            disabled={game.data.length === 0}
            onClick={() => clear.mutate({ id: game.id })}
          >
            Alle löschen
          </Button>
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
          {game.data.length} von {width * height} Pixeln gesetzt
        </p>
        {game.data.length > 0 && (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto rounded-2xl border border-white/10 p-1">
            {game.data.map((cell) => (
              <li
                key={cell.id}
                className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm"
              >
                <span
                  className="size-4 shrink-0 rounded-[18%]"
                  style={{ backgroundColor: cell.colorHex }}
                  aria-hidden
                />
                <span className="w-16 font-mono tabular-nums">
                  {cell.x}, {cell.y}
                </span>
                <span className="font-mono text-white/70">{cell.colorHex}</span>
                <span className="ml-auto hidden text-xs text-white/40 md:inline">
                  {formatDateTime(cell.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    deletePixel.mutate({ id: game.id, x: cell.x, y: cell.y })
                  }
                  aria-label={`Pixel ${cell.x}, ${cell.y} löschen`}
                  className="hover:text-neon-magenta ml-auto flex size-8 items-center justify-center rounded-full text-white/50 md:ml-0"
                >
                  <DynamicIcon name="Trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
