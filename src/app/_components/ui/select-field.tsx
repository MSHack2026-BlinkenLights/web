import { type ReactNode, type SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

/** Dark native select with a small label above, e.g. for list filters. */
export function SelectField({
  label,
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-white/60 ${className}`}>
      {label}
      <select
        {...props}
        className="bg-pixel-off focus-visible:outline-neon-cyan min-h-12 w-full min-w-0 rounded-xl border border-white/10 px-3 text-sm text-white focus-visible:outline-2"
      >
        {children}
      </select>
    </label>
  );
}
