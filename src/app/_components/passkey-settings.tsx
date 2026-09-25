"use client";

import Link from "next/link";
import { useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { authClient } from "wbl/server/better-auth/client";

/**
 * Lets the signed-in user register, list and delete passkeys.
 *
 * @returns A sign-in hint when nobody is signed in, otherwise the passkey list.
 */
export function PasskeySettings() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: passkeys, isPending: isListPending } =
    authClient.useListPasskeys();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (isSessionPending) return null;

  if (!session) {
    return (
      <p className="text-sm text-white/60">
        <Link
          href="/anmelden?next=/settings"
          className="text-neon-cyan underline"
        >
          Melde dich an
        </Link>
        , um Passkeys zu verwalten.
      </p>
    );
  }

  const addPasskey = async () => {
    setError(null);
    setIsPending(true);
    const { error } = await authClient.passkey.addPasskey();
    setIsPending(false);
    if (!error) return;
    if (
      "code" in error &&
      error.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
    ) {
      setError("Dieser Passkey ist schon registriert.");
    } else {
      setError("Passkey konnte nicht hinzugefügt werden.");
    }
  };

  const deletePasskey = async (id: string) => {
    setError(null);
    const { error } = await authClient.passkey.deletePasskey({ id });
    if (error) setError("Passkey konnte nicht gelöscht werden.");
  };

  return (
    <section className="flex w-full max-w-xs flex-col gap-3">
      <h2 className="text-lg font-semibold">Passkeys</h2>
      <p className="text-sm text-white/60">
        Melde dich ohne Passwort per Fingerabdruck, Gesicht oder PIN an.
      </p>

      {!isListPending && (passkeys?.length ?? 0) === 0 && (
        <p className="text-sm text-white/40">Noch keine Passkeys.</p>
      )}

      <ul className="flex flex-col gap-2">
        {passkeys?.map((passkey) => (
          <li
            key={passkey.id}
            className="flex min-h-12 items-center gap-3 rounded-full bg-white/10 pr-1 pl-4"
          >
            <DynamicIcon name="Fingerprint" size={20} />
            <span className="flex-1 truncate text-sm">
              {passkey.name ?? "Passkey"}
            </span>
            <button
              type="button"
              onClick={() => void deletePasskey(passkey.id)}
              aria-label={`${passkey.name ?? "Passkey"} löschen`}
              className="focus-visible:outline-neon-cyan flex size-10 items-center justify-center rounded-full text-white/60 transition hover:text-white focus-visible:outline-2"
            >
              <DynamicIcon name="Trash" size={20} />
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-neon-magenta text-center text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void addPasskey()}
        disabled={isPending}
        className="bg-neon-cyan text-surface min-h-12 rounded-full px-10 font-semibold transition disabled:opacity-60"
      >
        {isPending ? "Einen Moment …" : "Passkey hinzufügen"}
      </button>
    </section>
  );
}
