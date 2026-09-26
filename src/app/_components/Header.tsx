"use client";

import { Blobatar } from "@blobatar/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { DesktopNav } from "wbl/app/_components/DesktopNav";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { authClient } from "wbl/server/better-auth/client";

const menuItemClass =
  "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-white/90 transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none";

interface HeaderProps {
  /** The signed-in user's name from the server render, used until the client session has loaded. */
  initialUserName?: string;
}

/**
 * Sticky top bar with logo, desktop navigation and account menu.
 *
 * @param props - The user's name from the server render, if signed in.
 * @returns The header element.
 */
export function Header({ initialUserName }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const userName = isPending ? initialUserName : session?.user.name;

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await authClient.signOut();
    router.refresh();
  };

  return (
    <header className="bg-surface/90 sticky top-0 z-40 border-b border-white/10 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between gap-4 px-4 md:max-w-5xl md:px-6">
        <Link
          href="/"
          className="flex min-h-12 shrink-0 items-center font-bold tracking-tight text-white"
        >
          Blinkin Lights
        </Link>

        <DesktopNav className="hidden md:block" />

        <div ref={containerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={userName ? `Konto von ${userName}` : "Konto"}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            className="focus-visible:outline-neon-cyan -mr-2 flex size-12 items-center justify-center rounded-full text-white/80 transition-colors hover:text-white focus-visible:outline-2"
          >
            {userName ? (
              <Blobatar name={userName} size={32} alt="" />
            ) : (
              <DynamicIcon name="User" size={28} />
            )}
          </button>

          {open && (
            <div
              id={menuId}
              role="menu"
              className="bg-pixel-off absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/10 p-1 shadow-lg shadow-black/50"
            >
              {userName ? (
                <p className="truncate px-3 py-2 text-xs text-white/50">
                  Angemeldet als{" "}
                  <span className="text-white/80">{userName}</span>
                </p>
              ) : (
                <Link
                  href={`/anmelden?weiter=${encodeURIComponent(pathname)}`}
                  role="menuitem"
                  className={menuItemClass}
                >
                  <DynamicIcon name="LogIn" size={20} />
                  Anmelden
                </Link>
              )}

              {userName && (
                <Link href="/konto" role="menuitem" className={menuItemClass}>
                  <DynamicIcon name="User" size={20} />
                  Konto
                </Link>
              )}

              <Link href="/debugger" role="menuitem" className={menuItemClass}>
                <DynamicIcon name="Bug" size={20} />
                Debugger öffnen
              </Link>

              {userName && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                  className={menuItemClass}
                >
                  <DynamicIcon name="LogOut" size={20} />
                  Abmelden
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
