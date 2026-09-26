import { type Metadata } from "next";

import { AdminNav } from "wbl/app/admin/_components/AdminNav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Frame of the admin area with its own tab bar.
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
      <AdminNav />
      {children}
    </main>
  );
}
