import Link from "next/link";
import { type ReactNode } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

/** Input style shared by all admin forms, matching the "Mitspielen" form. */
export const fieldClass =
  "bg-pixel-off focus-visible:outline-neon-cyan min-h-12 w-full rounded-xl border border-white/10 px-3 text-base text-white focus-visible:outline-2 disabled:opacity-60";

/**
 * Label above a form control, with an optional hint below.
 *
 * @param props - The label, optional hint, extra classes and the control.
 * @returns The label element.
 */
export function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-white/70 ${className}`}>
      {label}
      {children}
      {hint && <span className="text-xs text-white/40">{hint}</span>}
    </label>
  );
}

/**
 * Page title of an admin page with an optional back link and action.
 *
 * @param props - The title, description, back link and action.
 * @returns The header element.
 */
export function AdminHeader({
  title,
  description,
  back,
  action,
}: {
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {back && (
        <Link
          href={back.href}
          className="hover:text-neon-cyan flex w-fit items-center gap-1 text-sm text-white/60 transition-colors"
        >
          <DynamicIcon name="NavArrowLeft" size={16} />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold break-all">{title}</h1>
        {action}
      </div>
      {description && <p className="text-sm text-white/60">{description}</p>}
    </header>
  );
}

/**
 * One linked row of an admin list.
 *
 * @param props - Link target, title, subtitle, right-hand meta and an optional badge.
 * @returns The list item.
 */
export function AdminRow({
  href,
  title,
  subtitle,
  meta,
  badge,
}: {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="focus-visible:outline-neon-cyan flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/5 focus-visible:outline-2"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-sm font-semibold">
            {title}
            {badge}
          </p>
          {subtitle && (
            <p className="truncate text-xs text-white/50">{subtitle}</p>
          )}
        </div>
        {meta && (
          <div className="shrink-0 text-right text-xs text-white/60 tabular-nums">
            {meta}
          </div>
        )}
        <DynamicIcon
          name="NavArrowRight"
          size={18}
          className="shrink-0 text-white/30"
        />
      </Link>
    </li>
  );
}

/** Container for {@link AdminRow}s. */
export function AdminList({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col gap-1 rounded-2xl border border-white/10 p-1">
      {children}
    </ul>
  );
}

/**
 * Small colored label, e.g. "läuft".
 *
 * @param props - The label and its tone.
 * @returns The badge.
 */
export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "green" | "cyan" | "magenta" | "neutral";
  children: ReactNode;
}) {
  const tones = {
    green: "bg-neon-green/15 text-neon-green",
    cyan: "bg-neon-cyan/15 text-neon-cyan",
    magenta: "bg-neon-magenta/15 text-neon-magenta",
    neutral: "bg-white/10 text-white/70",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Key/value grid for read-only details.
 *
 * @param props - The entries as label and value pairs.
 * @returns The description list.
 */
export function DetailList({
  entries,
}: {
  entries: [label: string, value: ReactNode][];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:grid-cols-4">
      {entries.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-white/50">{label}</dt>
          <dd className="mt-0.5 font-medium break-all">{value ?? "–"}</dd>
        </div>
      ))}
    </dl>
  );
}
