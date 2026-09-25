"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

const navItems = [
  { label: "Home", href:"/", iconName: "Home" }
];

export function BottomBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-gray-800 dark:bg-gray-950">
      <div className="flex h-16 items-center justify-between">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.iconName;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 text-xs transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
              >
              <DynamicIcon name={Icon} size={24} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}



