import Link from "next/link";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

/** "Alle →" link for a Section's action slot. */
export function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group text-neon-cyan focus-visible:outline-neon-cyan hover:bg-neon-cyan/10 -mr-2 flex min-h-12 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-2"
    >
      {label}
      <DynamicIcon
        name="NavArrowRight"
        size={16}
        className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}
