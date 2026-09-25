"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Section } from "wbl/app/_components/ui/section";
import { TextField } from "wbl/app/_components/ui/text-field";
import { useFormAction } from "wbl/app/_components/ui/use-form-action";
import { authClient } from "wbl/server/better-auth/client";

/**
 * Danger zone for permanently deleting the signed-in user's account.
 *
 * @returns The delete-account section.
 */
export function DeleteAccount() {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const { status, isPending, run } = useFormAction();

  return (
    <Section
      title="Gefahrenzone"
      icon="WarningTriangle"
      tone="magenta"
      description="Dein Konto und alle Passkeys werden dauerhaft gelöscht."
    >
      {!isConfirming ? (
        <Button
          variant="outline"
          tone="magenta"
          className="self-start"
          onClick={() => setIsConfirming(true)}
        >
          Konto löschen
        </Button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const { error } = await authClient.deleteUser({ password });
              if (error) {
                return {
                  error:
                    error.code === "INVALID_PASSWORD"
                      ? "Das Passwort stimmt nicht."
                      : "Konto konnte nicht gelöscht werden.",
                };
              }
              router.push("/");
              router.refresh();
            });
          }}
          className="flex flex-col gap-2"
        >
          <TextField
            label="Passwort zur Bestätigung"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <FormStatus {...status} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="submit" tone="magenta" isPending={isPending}>
              Endgültig löschen
            </Button>
            <Button
              variant="ghost"
              tone="neutral"
              onClick={() => {
                setIsConfirming(false);
                setPassword("");
              }}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      )}
    </Section>
  );
}
