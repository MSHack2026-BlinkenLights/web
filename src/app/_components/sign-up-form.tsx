"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { TextField } from "wbl/app/_components/ui/text-field";
import { useFormAction } from "wbl/app/_components/ui/use-form-action";
import { authClient } from "wbl/server/better-auth/client";

interface SignUpFormProps {
  /** Where to navigate after signing up. */
  redirectTo: string;
}

/**
 * Account creation with nickname, email and password.
 *
 * @param props - The redirect target after a successful sign-up.
 * @returns The sign-up form.
 */
export function SignUpForm({ redirectTo }: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { status, isPending, run } = useFormAction();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const { error } = await authClient.signUp.email({
            name,
            email,
            password,
          });
          if (error) {
            return { error: error.message ?? "Da ist etwas schiefgelaufen." };
          }
          router.push(redirectTo);
          router.refresh();
        });
      }}
      className="flex flex-col gap-2"
    >
      <TextField
        label="Spitzname"
        autoComplete="nickname"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <TextField
        label="E-Mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextField
        label="Passwort"
        type="password"
        hint="Mindestens 8 Zeichen"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />
      <FormStatus {...status} />
      <Button
        type="submit"
        tone="magenta"
        isPending={isPending}
        className="mt-2"
      >
        Konto erstellen
      </Button>
    </form>
  );
}
