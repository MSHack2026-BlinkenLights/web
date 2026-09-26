import { type ReactNode } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

/** Friendly placeholder for a list without entries. */
export function EmptyState({
  icon,
  children,
}: {
  /** Iconoir icon name. */
  icon: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
      <DynamicIcon name={icon} size={32} className="text-white/40" />
      <p className="text-white/80">{children}</p>
    </div>
  );
}

/** Load error with a retry button. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 p-6 text-center">
      <p className="text-white/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-12 rounded-xl bg-white/10 px-5 text-sm font-semibold transition-colors hover:bg-white/15"
      >
        Erneut versuchen
      </button>
    </div>
  );
}
