"use client";

import { useEffect, useState } from "react";

import { PixelGrid } from "wbl/app/_components/PixelGrid";

/** Local animation only: no game ID is passed to the hardware/pad API. */
export function DemoGamePreview({ gameId }: { gameId: string }) {
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(preference.matches);
    const onChange = () => setPaused(preference.matches);
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setFrame((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const seed = [...gameId].reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  const colors = ["#22E4FF", "#FF3DDB", "#FFE14D", "#3DFF7A"];
  const pixels = Array.from({ length: 25 }, (_, index) => {
    const position = (index + frame + seed) % 25;
    return position < 5
      ? (colors[(seed + position) % colors.length] ?? null)
      : null;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-cyan-200">
          {paused ? "Demo paused" : "Demo — simulated state"}
        </span>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          {paused ? "Resume preview" : "Pause preview"}
        </button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0e0f14] p-6">
        <PixelGrid
          width={5}
          height={5}
          pixels={pixels}
          label="Simulated game state, 5 by 5 LED grid"
        />
      </div>
      <p className="text-sm leading-relaxed text-white/60">
        Illustrative animation, not actual gameplay or a hardware feed.
        {paused
          ? " Updates are paused."
          : " Updates every second while this tab is visible."}
      </p>
    </div>
  );
}
