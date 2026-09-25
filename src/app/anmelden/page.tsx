import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "wbl/app/_components/auth-form";
import { getSession } from "wbl/server/better-auth/server";

export const metadata: Metadata = {
  title: "Anmelden",
  robots: { index: false, follow: false },
};

/** Only allow same-origin paths to prevent open redirects. */
function safeRedirectPath(next: string | undefined) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(next);

  const session = await getSession();
  if (session) redirect(redirectTo);

  return (
    <main className="bg-surface mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pt-10 pb-6 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Anmelden</h1>
        <p className="mt-1 text-sm text-white/60">
          Zum Spielen brauchst du kein Konto.
        </p>
      </div>

      <AuthForm redirectTo={redirectTo} />
    </main>
  );
}
