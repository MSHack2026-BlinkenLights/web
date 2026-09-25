"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { isNavItemActive, navItems } from "wbl/app/_components/nav-items";

/** Mobile navigation; on desktop the same items live in the Header. */
export function BottomBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hauptnavigation"
      className="bg-surface/90 fixed right-0 bottom-0 left-0 z-50 border-t border-white/10 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between">
        {navItems.map((item) => {
          const isActive = isNavItemActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center space-y-1 text-xs transition-colors ${
                isActive
                  ? "text-neon-cyan font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <DynamicIcon name={item.iconName} size={24} />
              {isActive && (
                <span className="max-w-full truncate text-xs whitespace-nowrap">
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
