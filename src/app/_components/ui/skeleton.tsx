import { type ReactNode } from "react";

/**
 * Placeholder block that pulses like an unlit LED while its content loads.
 * Size and shape come from `className`, e.g. `h-4 w-32` or `size-8 rounded-full`.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`rounded-lg bg-white/10 motion-safe:animate-pulse ${className}`}
    />
  );
}

/**
 * Wraps skeleton content and announces the loading state once to screen
 * readers, instead of every placeholder block on its own.
 *
 * @param props - The announced label, classes for the wrapper and the placeholders.
 * @returns The status element.
 */
export function SkeletonGroup({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
