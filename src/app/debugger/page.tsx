import { type Metadata } from "next";

import { LivePadGrid } from "wbl/app/_components/LivePadGrid";
import { PadConsole } from "wbl/app/_components/PadConsole";
import { PageShell } from "wbl/app/_components/ui/page-shell";

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
    // Mobile: stacked column above the BottomBar. Desktop: grid left, console
    // right, both filling the viewport below the header.
    <PageShell
      fill
      className="md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:grid-rows-[auto_minmax(0,1fr)] md:gap-6"
    >
      <header className="md:col-span-2">
        <h1 className="text-2xl font-bold md:text-3xl">Pad-Debugger</h1>
        <p className="text-sm text-white/60">
          Pad: <code className="font-mono">{padId}</code>
        </p>
      </header>

      <LivePadGrid
        padId={padId}
        className="mx-auto max-w-56 shrink-0 md:max-w-sm md:self-start"
      />

      <PadConsole padId={padId} className="min-h-48 flex-1 md:h-full" />
    </PageShell>
  );
}
