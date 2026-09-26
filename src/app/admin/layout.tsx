import { type Metadata } from "next";

import { AdminNav } from "wbl/app/admin/_components/AdminNav";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Frame of the temporary admin area: warning banner and its own tab bar.
 *
 * @param props - The admin page.
 * @returns The admin layout.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // TODO: Restrict to admins; see adminProcedure in wbl/server/api/trpc.
  return (
    <main className="bg-surface mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-6 pb-28 text-white md:max-w-5xl md:px-6 md:pb-12">
      <p className="border-neon-yellow/40 bg-neon-yellow/10 text-neon-yellow flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
        <DynamicIcon name="WarningTriangle" size={18} className="shrink-0" />
        Temporärer Adminbereich – ohne Rechteprüfung, jede Änderung wirkt
        sofort.
      </p>
      <AdminNav />
      {children}
    </main>
  );
}
