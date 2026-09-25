"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { navItems, useActiveNav } from "wbl/app/_components/nav-items";

/** Desktop tab bar in the Header; mobile uses the BottomBar. */
export function DesktopNav({ className = "" }: { className?: string }) {
  const { activeHref, pendingHref, onNavigate } = useActiveNav();
  const listRef = useRef<HTMLUListElement>(null);
  const pillRef = useRef<HTMLLIElement>(null);

  // Move the pill under the active link. Styles are written straight to the
  // DOM node so the browser always sees old → new values and runs the CSS
  // transition; the very first placement skips it (no slide-in from 0).
  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;

    const place = () => {
      const link = activeHref
        ? list.querySelector<HTMLElement>(
            `[data-nav-href="${CSS.escape(activeHref)}"]`,
          )
        : null;

      // No active tab, or nav hidden (mobile): hide and re-arm first placement.
      if (!link || link.offsetWidth === 0) {
        pill.style.opacity = "0";
        delete pill.dataset.placed;
        return;
      }

      const firstPlacement = pill.dataset.placed === undefined;
      if (firstPlacement) pill.style.transition = "none";

      // offsetLeft would be relative to the positioned <li>, so use rects.
      const left =
        link.getBoundingClientRect().left - list.getBoundingClientRect().left;

      pill.style.opacity = "1";
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.transform = `translateX(${left}px)`;

      if (firstPlacement) {
        void pill.offsetWidth; // flush, so re-enabling doesn't animate this step
        pill.style.transition = "";
        pill.dataset.placed = "";
      }
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeHref]);

  return (
    <nav aria-label="Hauptnavigation" className={className}>
      <ul ref={listRef} className="relative flex items-center gap-1">
        <li
          ref={pillRef}
          role="presentation"
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 rounded-lg bg-white/10 opacity-0 motion-safe:transition-[transform,width,opacity] motion-safe:duration-300 motion-safe:ease-out ${
            pendingHref ? "motion-safe:animate-pulse" : ""
          }`}
        />

        {navItems.map((item) => {
          const isActive = item.href === activeHref;
          const isPending = item.href === pendingHref;

          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                onClick={onNavigate(item.href)}
                data-nav-href={item.href}
                aria-current={isActive && !isPending ? "page" : undefined}
                aria-busy={isPending || undefined}
                className={`focus-visible:outline-neon-cyan flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 ${
                  isActive
                    ? "text-neon-cyan font-semibold"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <DynamicIcon
                  name={item.iconName}
                  size={20}
                  className={
                    isPending ? "motion-safe:animate-pulse" : undefined
                  }
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
