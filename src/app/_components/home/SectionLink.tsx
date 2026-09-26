import Link from "next/link";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

/** "Alle →" link for a Section's action slot. */
export function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-neon-cyan focus-visible:outline-neon-cyan -mr-2 flex min-h-12 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-semibold focus-visible:outline-2"
    >
      {label}
      <DynamicIcon name="NavArrowRight" size={16} />
    </Link>
  );
}
