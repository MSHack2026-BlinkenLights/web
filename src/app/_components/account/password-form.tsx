"use client";

import { useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Section } from "wbl/app/_components/ui/section";
import { TextField } from "wbl/app/_components/ui/text-field";
import { useFormAction } from "wbl/app/_components/ui/use-form-action";
import { authClient } from "wbl/server/better-auth/client";

/**
 * Lets the signed-in user change their password.
 *
 * @returns The password section.
 */
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const { status, isPending, run } = useFormAction();

  return (
    <Section title="Passwort" icon="Lock">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (newPassword !== repeatPassword) {
              return { error: "Die neuen Passwörter stimmen nicht überein." };
            }
            const { error } = await authClient.changePassword({
              currentPassword,
              newPassword,
              revokeOtherSessions,
            });
            if (error) {
              return {
                error:
                  error.code === "INVALID_PASSWORD"
                    ? "Das aktuelle Passwort stimmt nicht."
                    : "Passwort konnte nicht geändert werden.",
              };
            }
            setCurrentPassword("");
            setNewPassword("");
            setRepeatPassword("");
            return { success: "Passwort geändert." };
          });
        }}
        className="flex flex-col gap-2"
      >
        <TextField
          label="Aktuelles Passwort"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <TextField
          label="Neues Passwort"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />
        <TextField
          label="Neues Passwort wiederholen"
          type="password"
          hint="Mindestens 8 Zeichen"
          autoComplete="new-password"
          value={repeatPassword}
          onChange={(e) => setRepeatPassword(e.target.value)}
          required
          minLength={8}
        />
        <label className="flex min-h-12 cursor-pointer items-center gap-3 px-1 text-sm text-white/80">
          <input
            type="checkbox"
            checked={revokeOtherSessions}
            onChange={(e) => setRevokeOtherSessions(e.target.checked)}
            className="accent-neon-cyan size-5"
          />
          Auf anderen Geräten abmelden
        </label>
        <FormStatus {...status} />
        <Button type="submit" isPending={isPending} className="mt-2 self-start">
          Passwort ändern
        </Button>
      </form>
    </Section>
  );
}
