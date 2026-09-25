import { LivePadGrid } from "wbl/app/_components/LivePadGrid";

export default function LivePage() {
  return (
    <main className="bg-surface flex min-h-dvh flex-col items-center gap-6 px-4 py-8 text-white">
      <h1 className="text-2xl font-bold">Live-Ansicht</h1>
      <LivePadGrid padId="demo-pad" className="max-w-xs" />
    </main>
  );
}
