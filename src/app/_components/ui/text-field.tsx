import { type InputHTMLAttributes, useId } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Accessible name, also shown as placeholder. */
  label: string;
  /** Short help text below the field. */
  hint?: string;
}

/**
 * The site's pill-shaped text input.
 *
 * @param props - The label, optional hint and native input attributes.
 * @returns The input, followed by its hint if given.
 */
export function TextField({ label, hint, ...props }: TextFieldProps) {
  const hintId = useId();

  return (
    <>
      <input
        placeholder={label}
        aria-label={label}
        aria-describedby={hint ? hintId : undefined}
        className="focus-visible:outline-neon-cyan min-h-12 w-full rounded-full bg-white/10 px-4 text-white placeholder:text-white/40 focus-visible:outline-2"
        {...props}
      />
      {hint && (
        <p id={hintId} className="px-4 text-xs text-white/40">
          {hint}
        </p>
      )}
    </>
  );
}
