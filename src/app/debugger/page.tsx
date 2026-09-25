import { type Metadata } from "next";

import { LivePadGrid } from "wbl/app/_components/LivePadGrid";
import { PadConsole } from "wbl/app/_components/PadConsole";

export const metadata: Metadata = {
  title: "Pad-Debugger",
  robots: { index: false, follow: false },
};

const DEFAULT_PAD_ID = "demo-pad";

export default async function DebuggerPage({
  searchParams,
}: {
  searchParams: Promise<{ pad?: string }>;
}) {
  // TODO: Restrict to logged-in maintainers (Better Auth) once login is in place.
  const { pad } = await searchParams;
  const padId = pad ?? DEFAULT_PAD_ID;

  return (
    <main className="bg-surface mx-auto flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full max-w-md flex-col gap-4 px-4 pt-6 pb-4 text-white md:h-dvh">
      <header>
        <h1 className="text-2xl font-bold">Pad-Debugger</h1>
        <p className="text-sm text-white/60">
          Pad: <code className="font-mono">{padId}</code>
        </p>
      </header>

      <LivePadGrid padId={padId} className="mx-auto max-w-56 shrink-0" />

      <PadConsole padId={padId} className="min-h-48 flex-1" />
    </main>
  );
}
