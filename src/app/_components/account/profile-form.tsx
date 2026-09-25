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
 * Lets the signed-in user change their nickname.
 *
 * @param props - The current nickname.
 * @returns The profile section.
 */
export function ProfileForm({ name: currentName }: { name: string }) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const { status, isPending, run } = useFormAction();

  const trimmed = name.trim();

  return (
    <Section title="Profil" icon="User">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const { error } = await authClient.updateUser({ name: trimmed });
            if (error) {
              return { error: "Spitzname konnte nicht gespeichert werden." };
            }
            router.refresh();
            return { success: "Gespeichert." };
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
        <FormStatus {...status} />
        <Button
          type="submit"
          isPending={isPending}
          disabled={isPending || !trimmed || trimmed === currentName}
          className="mt-2 self-start"
        >
          Speichern
        </Button>
      </form>
    </Section>
  );
}
