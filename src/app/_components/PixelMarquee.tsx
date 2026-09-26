"use client";

import { useEffect, useState } from "react";

import { PixelGrid } from "wbl/app/_components/PixelGrid";
import { sliceBitmap, textToBitmap } from "wbl/utils/pixel-font";

interface PixelMarqueeProps {
  text: string;
  /** Visible columns of the LED grid. */
  width: number;
  /** CSS colors, cycled per character. */
  colors?: readonly string[];
  /** Milliseconds per column step. */
  stepMs?: number;
  /** Shown centered and still for `prefers-reduced-motion`; must fit `width`. */
  staticText: string;
  className?: string;
}

/**
 * Scrolling LED text, like a message running across a pad. Enters from the
 * right, leaves to the left, repeats. Pauses while the tab is hidden.
 */
export function PixelMarquee({
  text,
  width,
  colors = ["var(--color-neon-cyan)"],
  stepMs = 110,
  staticText,
  className = "",
}: PixelMarqueeProps) {
  const [offset, setOffset] = useState(-width);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(preference.matches);
    const onChange = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

  const bitmap = textToBitmap(reducedMotion ? staticText : text, colors, 1);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setOffset((value) => (value >= bitmap.width ? -width : value + 1));
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [reducedMotion, bitmap.width, width, stepMs]);

  const frame = sliceBitmap(
    bitmap,
    reducedMotion ? -Math.floor((width - bitmap.width) / 2) : offset,
    width,
  );

  return (
    <PixelGrid {...frame} animate={false} label={text} className={className} />
  );
}
