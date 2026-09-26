import Link from "next/link";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { AdminHeader } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const overview = await api.admin.overview();
  const tiles = [
    {
      href: "/admin/spieltypen",
      label: "Spieltypen",
      icon: "Gamepad",
      count: overview.gameTypes,
    },
    {
      href: "/admin/controller",
      label: "Controller",
      icon: "Cpu",
      count: overview.controllers,
    },
    {
      href: "/admin/spiele",
      label: "Spiele",
      icon: "ViewGrid",
      count: overview.games,
      extra: `${overview.runningGames} laufen gerade`,
    },
    {
      href: "/admin/anfragen",
      label: "Anfragen",
      icon: "BubbleSearch",
      count: overview.playRequests,
    },
    {
      href: "/admin/nutzer",
      label: "Nutzer",
      icon: "Group",
      count: overview.users,
    },
  ];

  return (
    <>
      <AdminHeader
        title="Admin"
        description="Stammdaten, Spiele und Nutzer ansehen und bearbeiten."
      />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className="hover:border-neon-cyan/50 focus-visible:outline-neon-cyan flex h-full flex-col gap-2 rounded-2xl border border-white/10 p-4 transition-colors focus-visible:outline-2"
            >
              <DynamicIcon
                name={tile.icon}
                size={24}
                className="text-neon-cyan"
              />
              <span className="text-3xl font-bold tabular-nums">
                {tile.count}
              </span>
              <span className="text-sm text-white/70">{tile.label}</span>
              {tile.extra && (
                <span className="text-neon-green text-xs">{tile.extra}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
