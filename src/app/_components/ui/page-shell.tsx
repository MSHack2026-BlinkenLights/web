import { type ReactNode } from "react";

const widthClasses = {
  /** Forms and settings: a bit wider than the phone column on desktop. */
  medium: "max-w-md md:max-w-2xl",
  /** Content pages: as wide as the Header on desktop. */
  wide: "max-w-md md:max-w-page",
} as const;

interface PageShellProps {
  width?: keyof typeof widthClasses;
  /**
   * Fill the viewport between Header and BottomBar instead of growing with
   * the content, e.g. for a map. Children then share the height via flex.
   */
  fill?: boolean;
  /** Extra space at the bottom on mobile for an element floating above the BottomBar. */
  floatingAction?: boolean;
  title?: string;
  description?: ReactNode;
  /** Classes for the <main> element, e.g. a desktop grid. */
  className?: string;
  children: ReactNode;
}

/**
 * The <main> element of a page: width, padding and height below the Header,
 * plus an optional page title with description.
 *
 * @param props - Width, fill mode, floating action space, title and content.
 * @returns The main element.
 */
export function PageShell({
  width = "wide",
  fill = false,
  floatingAction = false,
  title,
  description,
  className = "",
  children,
}: PageShellProps) {
  const heightClasses = fill
    ? "h-[calc(100dvh-var(--header-h)-var(--bottombar-h))] min-h-[32rem] gap-4 pb-4 md:pb-6"
    : `gap-6 ${floatingAction ? "pb-40 md:pb-12" : "pb-12"}`;

  return (
    <main
      className={`bg-surface mx-auto flex w-full flex-col px-4 pt-6 text-white md:px-6 md:pt-8 ${widthClasses[width]} ${heightClasses} ${className}`}
    >
      {title && (
        <header>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-white/60 md:mt-2 md:text-base">
              {description}
            </p>
          )}
        </header>
      )}
      {children}
    </main>
  );
}
