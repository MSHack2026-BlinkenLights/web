export interface NavItem {
  label: string;
  href: string;
  iconName: string;
}

/** Primary navigation, shared by the mobile BottomBar and the desktop Header. */
export const navItems: NavItem[] = [
  { label: "Home", href: "/", iconName: "Home" },
  { label: "Mitspielen", href: "/looking-to-play", iconName: "BubbleSearch" },
  { label: "Live", href: "/live-view", iconName: "Map" },
  { label: "Pixelart", href: "/pixelart", iconName: "MagicWand" },
  { label: "Settings", href: "/settings", iconName: "Settings" },
];

/** Home only matches exactly; other tabs also match their sub-routes. */
export function isNavItemActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
