import { type CSSProperties, type ReactNode } from "react";

interface PixelFrameProps {
  children: ReactNode;
  /** Any CSS color; defaults to the neon green used for "live". */
  color?: string;
  className?: string;
}

/** Glowing pixel-art outline with stepped corners, e.g. to highlight live content. */
export function PixelFrame({
  children,
  color = "var(--color-neon-green)",
  className = "",
}: PixelFrameProps) {
  return (
    <div
      className={`drop-shadow-[0_0_0.375rem_var(--pixel-frame-color)] ${className}`}
      style={{ "--pixel-frame-color": color } as CSSProperties}
    >
      <div className="pixel-frame">{children}</div>
    </div>
  );
}
