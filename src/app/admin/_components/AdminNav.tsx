"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

const adminNavItems = [
  { href: "/admin", label: "Übersicht", iconName: "DashboardDots" },
  { href: "/admin/spieltypen", label: "Spieltypen", iconName: "Gamepad" },
  { href: "/admin/controller", label: "Controller", iconName: "Cpu" },
  { href: "/admin/spiele", label: "Spiele", iconName: "ViewGrid" },
  { href: "/admin/anfragen", label: "Anfragen", iconName: "BubbleSearch" },
  { href: "/admin/nutzer", label: "Nutzer", iconName: "Group" },
  { href: "/admin/websocket", label: "WebSocket", iconName: "Network" },
];

/** Tab bar between the admin sections; scrolls horizontally on small screens. */
export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Adminbereich"
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <ul className="flex w-max gap-1 rounded-xl border border-white/10 p-1">
        {adminNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`focus-visible:outline-neon-cyan flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 ${
                  active
                    ? "text-neon-cyan bg-white/10 font-semibold"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <DynamicIcon name={item.iconName} size={18} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
