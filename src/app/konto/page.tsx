import { Blobatar } from "@blobatar/react";
import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { DeleteAccount } from "wbl/app/_components/account/delete-account";
import { EmailForm } from "wbl/app/_components/account/email-form";
import { PasskeySettings } from "wbl/app/_components/account/passkey-settings";
import { PasswordForm } from "wbl/app/_components/account/password-form";
import { ProfileForm } from "wbl/app/_components/account/profile-form";
import { PageShell } from "wbl/app/_components/ui/page-shell";
import { getSession } from "wbl/server/better-auth/server";

export const metadata: Metadata = {
  title: "Konto",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/anmelden?weiter=/konto");

  const { user } = session;

  return (
    <PageShell width="medium" title="Konto">
      <div className="flex items-center gap-4 py-2">
        <div className="p-1">
          <Blobatar name={user.name} size={64} alt="" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.name}</p>
          <p className="truncate text-sm text-white/60">{user.email}</p>
        </div>
      </div>

      <ProfileForm key={user.name} name={user.name} />
      <EmailForm email={user.email} />
      <PasswordForm />
      <PasskeySettings />
      <DeleteAccount />
    </PageShell>
  );
}
