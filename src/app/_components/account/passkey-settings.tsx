"use client";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Section } from "wbl/app/_components/ui/section";
import { Skeleton } from "wbl/app/_components/ui/skeleton";
import { useFormAction } from "wbl/app/_components/ui/use-form-action";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { authClient } from "wbl/server/better-auth/client";

/**
 * Lets the signed-in user register, list and delete passkeys.
 *
 * @returns The passkey section.
 */
export function PasskeySettings() {
  const { data: passkeys, isPending: isListPending } =
    authClient.useListPasskeys();
  const { status, isPending, run } = useFormAction();

  return (
    <Section
      title="Passkeys"
      icon="Fingerprint"
      description="Melde dich ohne Passwort per Fingerabdruck, Gesicht oder PIN an."
    >
      <ul
        aria-busy={isListPending || undefined}
        className="flex flex-col gap-2"
      >
        {isListPending && (
          <li>
            <span className="sr-only">Passkeys werden geladen</span>
            <Skeleton className="h-12 rounded-full" />
          </li>
        )}
        {!isListPending && (passkeys?.length ?? 0) === 0 && (
          <li className="px-4 text-sm text-white/40">Noch keine Passkeys.</li>
        )}
        {passkeys?.map((passkey) => (
          <li
            key={passkey.id}
            className="flex min-h-12 items-center gap-3 rounded-full bg-white/10 pr-1 pl-4"
          >
            <span className="bg-neon-cyan shadow-neon-cyan size-2 shrink-0 rounded-full shadow-[0_0_0.5rem]" />
            <span className="flex-1 truncate text-sm">
              {passkey.name ?? "Passkey"}
            </span>
            {passkey.createdAt && (
              <span className="hidden text-xs text-white/40 sm:inline">
                {new Date(passkey.createdAt).toLocaleDateString("de-DE")}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                void run(async () => {
                  const { error } = await authClient.passkey.deletePasskey({
                    id: passkey.id,
                  });
                  if (error) {
                    return { error: "Passkey konnte nicht gelöscht werden." };
                  }
                })
              }
              aria-label={`${passkey.name ?? "Passkey"} löschen`}
              className="focus-visible:outline-neon-cyan hover:text-neon-magenta flex size-10 items-center justify-center rounded-full text-white/60 transition focus-visible:outline-2"
            >
              <DynamicIcon name="Trash" size={20} />
            </button>
          </li>
        ))}
      </ul>

      <FormStatus {...status} />

      <Button
        icon="Plus"
        isPending={isPending}
        className="self-start"
        onClick={() =>
          void run(async () => {
            const { error } = await authClient.passkey.addPasskey();
            if (!error) return;
            return {
              error:
                "code" in error &&
                error.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
                  ? "Dieser Passkey ist schon registriert."
                  : "Passkey konnte nicht hinzugefügt werden.",
            };
          })
        }
      >
        Passkey hinzufügen
      </Button>
    </Section>
  );
}
