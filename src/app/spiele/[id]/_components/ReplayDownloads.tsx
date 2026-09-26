"use client";

import { useEffect, useState } from "react";

import { Button, buttonClasses } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { type RouterOutputs } from "wbl/trpc/react";
import { renderReplayGif } from "wbl/utils/replay-gif";

type Game = RouterOutputs["claim"]["game"];

/** Downloads a blob under a file name via a temporary link. */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Replay as animated GIF preview plus downloads as GIF and raw JSON. Both are
 * built in the browser; nothing is stored on the server.
 *
 * @param props - The ended round with its cells.
 * @returns The preview and download buttons.
 */
export function ReplayDownloads({ game }: { game: Game }) {
  const [gif, setGif] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasCells = game.data.length > 0;
  const baseName = `blinkin-${game.gameType.key}-${game.endedAt.toISOString().slice(0, 10)}`;

  // Renders once on open: 3×3 to 16×16 grids encode in well under a second.
  useEffect(() => {
    if (!hasCells) return;
    let url: string | null = null;
    try {
      const blob = renderReplayGif(game.controller, game.data);
      url = URL.createObjectURL(blob);
      setGif({ blob, url });
    } catch (renderError) {
      console.error("Failed to render replay GIF:", renderError);
      setError("Die Vorschau konnte nicht erstellt werden.");
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [game, hasCells]);

  const downloadJson = () => {
    const json = {
      id: game.id,
      game: game.gameType.name,
      pad: game.controller.name,
      width: game.controller.width,
      height: game.controller.height,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      cells: game.data,
    };
    downloadBlob(
      new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }),
      `${baseName}.json`,
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {gif && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing for next/image to optimize
        <img
          src={gif.url}
          alt={`Replay von ${game.gameType.name} auf ${game.controller.name}`}
          className="mx-auto w-full max-w-sm rounded-2xl border border-white/10"
        />
      )}
      <FormStatus error={error} />
      <div className="grid grid-cols-2 gap-2">
        {gif ? (
          <a
            href={gif.url}
            download={`${baseName}.gif`}
            className={buttonClasses("solid", "cyan")}
          >
            GIF
          </a>
        ) : (
          <Button icon="Download" disabled>
            GIF
          </Button>
        )}
        <Button
          variant="outline"
          tone="neutral"
          icon="Code"
          onClick={downloadJson}
        >
          JSON
        </Button>
      </div>
      {!hasCells && (
        <p className="text-sm text-white/50">
          In dieser Runde wurden keine Pixel aufgezeichnet.
        </p>
      )}
    </div>
  );
}
