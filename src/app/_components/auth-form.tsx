"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { authClient } from "wbl/server/better-auth/client";

interface AuthFormProps {
  /** Where to navigate after a successful sign-in/sign-up. Stays on the page if omitted. */
  redirectTo?: string;
}

export function AuthForm({ redirectTo }: AuthFormProps = {}) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const isSignUp = mode === "sign-up";

  const onSignedIn = () => {
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  };

  // Offer saved passkeys in the browser's autofill (conditional UI).
  useEffect(() => {
    if (isSignUp) return;
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
  }, [isSignUp]);

  const signInWithPasskey = async () => {
    setError(null);
    setIsPending(true);
    const { error } = await authClient.signIn.passkey();
    setIsPending(false);
    if (error) {
      setError("Anmeldung mit Passkey abgebrochen oder fehlgeschlagen.");
      return;
    }
    onSignedIn();
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setIsPending(true);
        const { error } = isSignUp
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });
        setIsPending(false);
        if (error) {
          setError(error.message ?? "Da ist etwas schiefgelaufen.");
          return;
        }
        onSignedIn();
      }}
      className="flex w-full max-w-xs flex-col gap-2"
    >
      {isSignUp && (
        <input
          type="text"
          placeholder="Spitzname"
          aria-label="Spitzname"
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="focus-visible:outline-neon-cyan min-h-12 w-full rounded-full bg-white/10 px-4 text-white placeholder:text-white/40 focus-visible:outline-2"
        />
      )}
      <input
        type="email"
        placeholder="E-Mail"
        aria-label="E-Mail"
        autoComplete={isSignUp ? "email" : "email webauthn"}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="focus-visible:outline-neon-cyan min-h-12 w-full rounded-full bg-white/10 px-4 text-white placeholder:text-white/40 focus-visible:outline-2"
      />
      <input
        type="password"
        placeholder="Passwort"
        aria-label="Passwort"
        autoComplete={isSignUp ? "new-password" : "current-password webauthn"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        className="focus-visible:outline-neon-cyan min-h-12 w-full rounded-full bg-white/10 px-4 text-white placeholder:text-white/40 focus-visible:outline-2"
      />
      {error && (
        <p role="alert" className="text-neon-magenta text-center text-sm">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="bg-neon-cyan text-surface mt-2 min-h-12 rounded-full px-10 font-semibold transition disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? "Einen Moment …" : isSignUp ? "Registrieren" : "Anmelden"}
      </button>
      {!isSignUp && (
        <button
          type="button"
          onClick={() => void signInWithPasskey()}
          disabled={isPending}
          className="focus-visible:outline-neon-cyan flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-10 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 disabled:opacity-60"
        >
          <DynamicIcon name="Fingerprint" size={20} />
          Mit Passkey anmelden
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setMode(isSignUp ? "sign-in" : "sign-up");
          setError(null);
        }}
        className="min-h-12 text-sm text-white/70 hover:text-white"
      >
        {isSignUp
          ? "Du hast schon ein Konto? Anmelden"
          : "Noch kein Konto? Registrieren"}
      </button>
    </form>
  );
}
