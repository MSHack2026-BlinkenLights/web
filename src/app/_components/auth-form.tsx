"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
        if (redirectTo) router.push(redirectTo);
        router.refresh();
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
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="focus-visible:outline-neon-cyan min-h-12 w-full rounded-full bg-white/10 px-4 text-white placeholder:text-white/40 focus-visible:outline-2"
      />
      <input
        type="password"
        placeholder="Passwort"
        aria-label="Passwort"
        autoComplete={isSignUp ? "new-password" : "current-password"}
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
