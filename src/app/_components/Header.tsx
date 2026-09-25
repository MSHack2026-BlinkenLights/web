"use client";

import { Blobatar } from "@blobatar/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { isNavItemActive, navItems } from "wbl/app/_components/nav-items";
import { authClient } from "wbl/server/better-auth/client";

const menuItemClass =
  "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-white/90 transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const userName = session?.user.name;

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

        {/* Desktop navigation; mobile uses the BottomBar. */}
        <nav aria-label="Hauptnavigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item.href, pathname);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`focus-visible:outline-neon-cyan flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 ${
                      isActive
                        ? "text-neon-cyan bg-white/10 font-semibold"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <DynamicIcon name={item.iconName} size={20} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

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
              <DynamicIcon name="ProfileCircle" size={28} />
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
                  href={`/anmelden?next=${encodeURIComponent(pathname)}`}
                  role="menuitem"
                  className={menuItemClass}
                >
                  <DynamicIcon name="LogIn" size={20} />
                  Anmelden
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
