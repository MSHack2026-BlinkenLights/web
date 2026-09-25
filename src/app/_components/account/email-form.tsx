"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Section } from "wbl/app/_components/ui/section";
import { TextField } from "wbl/app/_components/ui/text-field";
import { useFormAction } from "wbl/app/_components/ui/use-form-action";
import { changeEmail } from "wbl/app/konto/actions";
import { authClient } from "wbl/server/better-auth/client";

/**
 * Lets the signed-in user change their email, confirmed with their password.
 *
 * @param props - The current email address.
 * @returns The email section.
 */
export function EmailForm({ email: currentEmail }: { email: string }) {
  const router = useRouter();
  const { refetch } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { status, isPending, run } = useFormAction();

  const isUnchanged = email.trim().toLowerCase() === currentEmail.toLowerCase();

  return (
    <Section
      title="E-Mail"
      icon="Mail"
      description={
        <>
          Aktuell: <span className="text-white/90">{currentEmail}</span>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const result = await changeEmail({
              newEmail: email.trim(),
              password,
            });
            if (result.error) return result;
            setEmail("");
            setPassword("");
            await refetch();
            router.refresh();
            return { success: "E-Mail geändert." };
          });
        }}
        className="flex flex-col gap-2"
      >
        <TextField
          label="Neue E-Mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Aktuelles Passwort"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FormStatus {...status} />
        <Button
          type="submit"
          isPending={isPending}
          disabled={isPending || isUnchanged}
          className="mt-2 self-start"
        >
          E-Mail ändern
        </Button>
      </form>
    </Section>
  );
}
