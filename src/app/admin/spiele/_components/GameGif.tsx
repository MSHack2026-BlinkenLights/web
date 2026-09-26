"use client";

import { useEffect, useState } from "react";

import { Button, buttonClasses } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { type RouterOutputs } from "wbl/trpc/react";
import { renderReplayGif } from "./game-gif";

type Game = RouterOutputs["admin"]["games"]["get"];

interface RenderedGif {
  url: string;
  sizeKb: number;
}

/**
 * Builds a replay GIF of a game in the browser and shows it with a download
 * link. Nothing is uploaded or stored on the server.
 *
 * @param props - The game with its grid size and cells.
 * @returns The button and, once rendered, the GIF.
 */
export function GameGif({ game }: { game: Game }) {
  const [gif, setGif] = useState<RenderedGif | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free the previous image when a new one replaces it or the page closes.
  useEffect(() => {
    if (!gif) return;
    return () => URL.revokeObjectURL(gif.url);
  }, [gif]);

  const handleRender = async () => {
    setRendering(true);
    setError(null);
    // Let the pending state paint before the synchronous encoding blocks.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const blob = renderReplayGif(game.controller, game.data);
      setGif({
        url: URL.createObjectURL(blob),
        sizeKb: Math.ceil(blob.size / 1024),
      });
    } catch (renderError) {
      console.error("Failed to render replay GIF:", renderError);
      setError("Das GIF konnte nicht erstellt werden.");
    } finally {
      setRendering(false);
    }
  };

  const fileName = `${game.gameType.key}-${game.startedAt.toISOString().slice(0, 10)}.gif`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          icon="MediaVideo"
          isPending={rendering}
          disabled={game.data.length === 0 || rendering}
          onClick={() => void handleRender()}
        >
          {gif ? "GIF neu erstellen" : "GIF erstellen"}
        </Button>
        {game.data.length === 0 && (
          <p className="text-sm text-white/50">
            Das Spiel hat noch keine Pixel.
          </p>
        )}
      </div>
      <FormStatus error={error} />
      {gif && (
        <figure className="flex flex-col gap-3 md:max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing for next/image to optimize */}
          <img
            src={gif.url}
            alt={`Replay von ${game.gameType.name} auf ${game.controller.name}`}
            className="w-full rounded-2xl border border-white/10"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
            {gif.sizeKb} KB · nur in diesem Browser
            <a
              href={gif.url}
              download={fileName}
              className={buttonClasses("outline", "neutral")}
            >
              Herunterladen
            </a>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
