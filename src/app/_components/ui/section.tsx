import { type ReactNode, useId } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { type Tone } from "wbl/app/_components/ui/button";

interface SectionProps {
  title: string;
  /** Iconoir icon name shown before the title. */
  icon: string;
  description?: ReactNode;
  tone?: Exclude<Tone, "neutral">;
  children: ReactNode;
}

/**
 * A titled page section, separated from the previous one by a hairline.
 *
 * @param props - The title, icon, optional description, tone and content.
 * @returns The section element.
 */
export function Section({
  title,
  icon,
  description,
  tone = "cyan",
  children,
}: SectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-white/10 pt-6"
    >
      <div>
        <h2
          id={headingId}
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <DynamicIcon
            name={icon}
            size={20}
            className={tone === "cyan" ? "text-neon-cyan" : "text-neon-magenta"}
          />
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-white/60">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
