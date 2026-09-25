import { PixelGrid } from "wbl/app/_components/PixelGrid";

/** Shown instantly while a route loads, so tab switches feel responsive. */
export default function Loading() {
  return (
    <main className="bg-surface flex min-h-[60dvh] items-center justify-center px-4">
      <PixelGrid
        width={3}
        height={3}
        pending
        label="Seite wird geladen"
        className="max-w-24"
      />
    </main>
  );
}
