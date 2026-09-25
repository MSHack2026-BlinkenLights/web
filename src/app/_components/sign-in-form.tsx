"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { TextField } from "wbl/app/_components/ui/text-field";
import { useFormAction } from "wbl/app/_components/ui/use-form-action";
import { authClient } from "wbl/server/better-auth/client";

interface SignInFormProps {
  /** Where to navigate after signing in. Stays on the page if omitted. */
  redirectTo?: string;
}

/**
 * Email/password sign-in with passkey button and passkey autofill.
 *
 * @param props - The redirect target after a successful sign-in.
 * @returns The sign-in form.
 */
export function SignInForm({ redirectTo }: SignInFormProps = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { status, isPending, run } = useFormAction();

  const onSignedIn = () => {
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  };

  // Offer saved passkeys in the browser's autofill (conditional UI).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!(await PublicKeyCredential.isConditionalMediationAvailable?.())) {
        return;
      }
      const { error } = await authClient.signIn.passkey({ autoFill: true });
      if (!error && !cancelled) onSignedIn();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const { error } = await authClient.signIn.email({
              email,
              password,
            });
            if (error) {
              return { error: error.message ?? "Da ist etwas schiefgelaufen." };
            }
            onSignedIn();
          });
        }}
        className="flex flex-col gap-2"
      >
        <TextField
          label="E-Mail"
          type="email"
          autoComplete="email webauthn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Passwort"
          type="password"
          autoComplete="current-password webauthn"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FormStatus {...status} />
        <Button type="submit" isPending={isPending} className="mt-2">
          Anmelden
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" />
        oder
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <Button
        variant="outline"
        tone="neutral"
        icon="Fingerprint"
        disabled={isPending}
        onClick={() =>
          void run(async () => {
            const { error } = await authClient.signIn.passkey();
            if (error) {
              return {
                error: "Anmeldung mit Passkey abgebrochen oder fehlgeschlagen.",
              };
            }
            onSignedIn();
          })
        }
      >
        Mit Passkey anmelden
      </Button>
    </div>
  );
}
