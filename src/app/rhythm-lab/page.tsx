import { type Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "wbl/app/_components/ui/button";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { env } from "wbl/env";

import { RhythmLab } from "./_components/rhythm-lab";

export const metadata: Metadata = {
  title: "Rhythm Lab",
  description:
    "Experimenteller Prototyp: ein Rhythmusspiel, bei dem die LEDs im Takt der Musik leuchten.",
};

export default function RhythmLabPage() {
  return (
    <PageShell
      title="Finde deinen Rhythmus"
      description={
        <>
          <span className="text-neon-cyan font-semibold">Experimentell · </span>
          Ein Takt, vier Richtungen. Folge den Lichtern und triff den Beat.
        </>
      }
    >
      <RhythmLab jamendoConfigured={Boolean(env.JAMENDO_CLIENT_ID)} />
      <footer className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <p className="max-w-3xl text-xs leading-relaxed text-white/50">
          Nur ein Prototyp: Die Musik wird erzeugt oder im Speicher dekodiert,
          das Spielfeld ist simuliert und die Eingabe kommt aus dem Browser. Es
          werden keine Daten an ein Spielfeld gesendet oder gespeichert. Starte
          mit angenehmer Lautstärke – das Feld wechselt die Helligkeit und
          blinkt kurz auf. Mit Escape stoppst du. Tab-Wechsel, Fokusverlust oder
          eine Audio-Unterbrechung beenden die Runde. Timing mit echter Hardware
          und Bluetooth-Synchronisation sind noch nicht garantiert.
        </p>
        <Link
          href="/live"
          className={`${buttonClasses("outline", "neutral")} shrink-0 px-5 text-sm`}
        >
          <DynamicIcon name="Map" size={20} />
          Zurück zur Karte
        </Link>
      </footer>
    </PageShell>
  );
}
