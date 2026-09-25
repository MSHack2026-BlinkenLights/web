"use client";

import Link from "next/link";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { navItems, useActiveNav } from "wbl/app/_components/nav-items";

/** Mobile navigation; on desktop the same items live in the Header. */
export function BottomBar() {
  const { activeHref, pendingHref, onNavigate } = useActiveNav();
  const activeIndex = navItems.findIndex((item) => item.href === activeHref);

  return (
    <nav
      aria-label="Hauptnavigation"
      className="bg-surface/90 fixed right-0 bottom-0 left-0 z-50 border-t border-white/10 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="relative mx-auto flex h-16 w-full max-w-md items-center justify-between">
        {/* Sliding LED indicator above the active tab. */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 flex justify-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
            style={{
              width: `${100 / navItems.length}%`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          >
            <span className="bg-neon-cyan shadow-neon-cyan h-0.5 w-10 rounded-full shadow-[0_0_0.5rem]" />
          </span>
        )}

        {navItems.map((item) => {
          const isActive = item.href === activeHref;
          const isPending = item.href === pendingHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate(item.href)}
              aria-label={item.label}
              aria-current={isActive && !isPending ? "page" : undefined}
              aria-busy={isPending || undefined}
              className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center space-y-1 text-xs transition-colors ${
                isActive
                  ? "text-neon-cyan font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <DynamicIcon
                name={item.iconName}
                size={24}
                className={isPending ? "motion-safe:animate-pulse" : undefined}
              />
              {isActive && (
                <span className="motion-safe:animate-nav-label max-w-full truncate text-xs whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
