import Link from "next/link";
import { type ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
  children: ReactNode;
}

/**
 * Page frame shared by the sign-in and sign-up pages: heading, form and a cross-link, centered on the page.
 *
 * @param props - The texts, footer link and the form to render.
 * @returns The page's `main` element.
 */
export function AuthShell({
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerHref,
  children,
}: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--header-h)-var(--bottombar-h))] w-full max-w-sm flex-col justify-center gap-8 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-white/60">{subtitle}</p>
      </div>

      {children}

      <p className="text-center text-sm text-white/60">
        {footerText}{" "}
        <Link
          href={footerHref}
          className="text-neon-cyan focus-visible:outline-neon-cyan rounded font-semibold underline-offset-4 hover:underline focus-visible:outline-2"
        >
          {footerLinkLabel}
        </Link>
      </p>
    </main>
  );
}
