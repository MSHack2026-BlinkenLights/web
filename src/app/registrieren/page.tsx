import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "wbl/app/_components/auth-shell";
import { safeRedirectPath } from "wbl/app/_components/safe-redirect";
import { SignUpForm } from "wbl/app/_components/sign-up-form";
import { getSession } from "wbl/server/better-auth/server";

export const metadata: Metadata = {
  title: "Registrieren",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ weiter?: string }>;
}) {
  const { weiter } = await searchParams;
  const redirectTo = safeRedirectPath(weiter);

  const session = await getSession();
  if (session) redirect(redirectTo);

  return (
    <AuthShell
      title="Konto erstellen"
      subtitle="Speichere deine Pixelart und Spielstände."
      footerText="Schon registriert?"
      footerLinkLabel="Anmelden"
      footerHref={`/anmelden?weiter=${encodeURIComponent(redirectTo)}`}
    >
      <SignUpForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
