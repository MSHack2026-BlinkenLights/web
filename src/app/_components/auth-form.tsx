"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "wbl/server/better-auth/client";

export function AuthForm() {
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
          setError(error.message ?? "Something went wrong");
          return;
        }
        router.refresh();
      }}
      className="flex w-full max-w-xs flex-col gap-2"
    >
      {isSignUp && (
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
      />
      {error && <p className="text-center text-red-400">{error}</p>}
      <button
        type="submit"
        className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
        disabled={isPending}
      >
        {isPending ? "Submitting..." : isSignUp ? "Sign up" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(isSignUp ? "sign-in" : "sign-up");
          setError(null);
        }}
        className="text-sm text-white/70 hover:text-white"
      >
        {isSignUp
          ? "Already have an account? Sign in"
          : "No account yet? Sign up"}
      </button>
    </form>
  );
}
