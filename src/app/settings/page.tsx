import { PasskeySettings } from "wbl/app/_components/passkey-settings";

export default function SettingsPage() {
  return (
    <main className="bg-surface flex min-h-dvh flex-col items-center gap-6 px-4 py-8 text-white">
      <h1 className="text-2xl font-bold">Einstellungen</h1>
      <PasskeySettings />
    </main>
  );
}
