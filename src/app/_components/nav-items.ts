import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";

export interface NavItem {
  label: string;
  href: string;
  iconName: string;
}

/** Primary navigation, shared by the mobile BottomBar and the desktop Header. */
export const navItems: NavItem[] = [
  { label: "Home", href: "/", iconName: "HomeSimpleDoor" },
  { label: "Mitspielen", href: "/mitspielen", iconName: "BubbleSearch" },
  { label: "Live", href: "/live", iconName: "Map" },
  { label: "Pixelart", href: "/pixelart", iconName: "MagicWand" },
  { label: "Bestenliste", href: "/bestenliste", iconName: "LeaderboardStar" },
];

/** Home only matches exactly; other tabs also match their sub-routes. */
export function isNavItemActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Active tab with optimistic updates: a clicked tab becomes active right away,
 * while the next route is still loading, and is marked as pending until then.
 */
export function useActiveNav() {
  const pathname = usePathname();
  const [pending, setPending] = useState<{ href: string; from: string }>();

  useEffect(() => setPending(undefined), [pathname]);

  // Ignore a stale target if the route changed before the effect ran.
  const pendingHref = pending?.from === pathname ? pending.href : undefined;
  const activeHref =
    pendingHref ??
    navItems.find((item) => isNavItemActive(item.href, pathname))?.href;

  function onNavigate(href: string) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      // Modified clicks open a new tab/window and don't navigate here.
      const modified =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (modified || event.button !== 0) return;
      if (!isNavItemActive(href, pathname)) {
        setPending({ href, from: pathname });
      }
    };
  }

  return { activeHref, pendingHref, onNavigate };
}
