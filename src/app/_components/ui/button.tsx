import { type ButtonHTMLAttributes } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";

/** Accent color of a control: cyan by default, magenta for sign-up and destructive actions. */
export type Tone = "cyan" | "magenta" | "neutral";

/** Visual weight of a button. */
export type Variant = "solid" | "outline" | "ghost";

const toneClasses: Record<Variant, Record<Tone, string>> = {
  solid: {
    cyan: "bg-neon-cyan text-surface shadow-[0_0_1rem] shadow-neon-cyan/40 focus-visible:outline-neon-cyan",
    magenta:
      "bg-neon-magenta text-surface shadow-[0_0_1rem] shadow-neon-magenta/40 focus-visible:outline-neon-magenta",
    neutral: "bg-white text-surface focus-visible:outline-white",
  },
  outline: {
    cyan: "border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/10 focus-visible:outline-neon-cyan",
    magenta:
      "border border-neon-magenta/60 text-neon-magenta hover:bg-neon-magenta/10 focus-visible:outline-neon-magenta",
    neutral:
      "border border-white/20 text-white hover:bg-white/10 focus-visible:outline-neon-cyan",
  },
  ghost: {
    cyan: "text-neon-cyan hover:bg-neon-cyan/10 focus-visible:outline-neon-cyan",
    magenta:
      "text-neon-magenta hover:bg-neon-magenta/10 focus-visible:outline-neon-magenta",
    neutral:
      "text-white/70 hover:text-white hover:bg-white/10 focus-visible:outline-neon-cyan",
  },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  tone?: Tone;
  /** Iconoir icon name shown before the label. */
  icon?: string;
  /** Replaces the label with a waiting text and disables the button. */
  isPending?: boolean;
}

/**
 * The site's pill button in all variants.
 *
 * @param props - The variant, tone, icon, pending state and native button attributes.
 * @returns The button element.
 */
export function Button({
  variant = "solid",
  tone = "cyan",
  icon,
  isPending = false,
  type = "button",
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? isPending}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-full px-8 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:shadow-none ${toneClasses[variant][tone]} ${className}`}
      {...props}
    >
      {icon && <DynamicIcon name={icon} size={20} />}
      {isPending ? "Einen Moment …" : children}
    </button>
  );
}
