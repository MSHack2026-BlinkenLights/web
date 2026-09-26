"use client";

import { Blobatar } from "@blobatar/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { DesktopNav } from "wbl/app/_components/DesktopNav";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { authClient } from "wbl/server/better-auth/client";

/** Scroll offsets: the border shows right away, the logo once the hero marquee is gone. */
const BORDER_AFTER = 8;
const LOGO_AFTER = 160;

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
  const [scrollStep, setScrollStep] = useState<"top" | "scrolled" | "pastHero">(
    "top",
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const isHome = pathname === "/";
  const userName = isPending ? initialUserName : session?.user.name;

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Coarse steps only, so scrolling re-renders just when a step changes.
  useEffect(() => {
    const onScroll = () =>
      setScrollStep(
        window.scrollY > LOGO_AFTER
          ? "pastHero"
          : window.scrollY > BORDER_AFTER
            ? "scrolled"
            : "top",
      );
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showBorder = !isHome || scrollStep !== "top";
  const showLogo = !isHome || scrollStep === "pastHero";

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
    <header
      className={`bg-surface/90 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur transition-[border-color,box-shadow] duration-300 ${showBorder ? "border-white/10" : "border-transparent"} ${scrollStep === "top" ? "" : "shadow-[0_0.5rem_1.5rem_-0.75rem] shadow-black/80"}`}
    >
      <div className="md:max-w-page mx-auto flex h-14 w-full max-w-md items-center justify-between gap-4 px-4 md:px-6">
        {/* The home page shows the name as its hero marquee, so the logo fades
            in only after scrolling past it. `invisible` keeps the slot, so the
            account button stays on the right. */}
        <Link
          href="/"
          className={`font-pixel flex min-h-12 shrink-0 items-center text-white transition-[opacity,visibility] duration-300 ${showLogo ? "" : "invisible opacity-0"}`}
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
            className="focus-visible:outline-neon-cyan -mr-2 flex h-12 min-w-12 items-center justify-center gap-2 rounded-full text-white/80 transition-colors hover:text-white focus-visible:outline-2 md:px-2 md:hover:bg-white/5"
          >
            {userName ? (
              <>
                <Blobatar name={userName} size={32} alt="" />
                {/* Desktop has room for the name; aria-label already names it. */}
                <span
                  aria-hidden
                  className="hidden max-w-36 truncate text-sm md:block"
                >
                  {userName}
                </span>
                <DynamicIcon
                  name="NavArrowDown"
                  size={16}
                  className={`hidden text-white/50 transition-transform motion-reduce:transition-none md:block ${open ? "rotate-180" : ""}`}
                />
              </>
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

              <Link href="/sichern" role="menuitem" className={menuItemClass}>
                <DynamicIcon name="ShieldCheck" size={20} />
                Spiel sichern
              </Link>

              <Link href="/historie" role="menuitem" className={menuItemClass}>
                <DynamicIcon name="Archive" size={20} />
                Meine Spiele
              </Link>

              {userName && (
                <Link href="/konto" role="menuitem" className={menuItemClass}>
                  <DynamicIcon name="User" size={20} />
                  Konto
                </Link>
              )}

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
