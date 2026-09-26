"use client";

import { Blobatar } from "@blobatar/react";
import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { PixelFrame } from "wbl/app/_components/PixelFrame";
import { SelectField } from "wbl/app/_components/ui/select-field";
import { Skeleton, SkeletonGroup } from "wbl/app/_components/ui/skeleton";
import { EmptyState, ErrorState } from "wbl/app/_components/ui/states";
import { api, type RouterOutputs } from "wbl/trpc/react";
import { formatDay } from "wbl/utils/time";

type LeaderboardList = RouterOutputs["leaderboard"]["list"];
type Entry = LeaderboardList["entries"][number];
type ScoreKind = NonNullable<LeaderboardList["game"]>["scoreKind"];
type Period = "today" | "week" | "all";

const SIGN_IN_HREF = "/anmelden?next=/bestenliste";

const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Heute" },
  { value: "week", label: "Woche" },
  { value: "all", label: "Allzeit" },
];

function formatScore(score: number, kind: ScoreKind) {
  const value = score.toLocaleString("de-DE");
  if (kind === "wins") return `${value} ${score === 1 ? "Sieg" : "Siege"}`;
  return `${value} Pkt.`;
}

/** Game tabs, period and location filters, podium, ranking and own entry. */
export function LeaderboardBoard() {
  const [gameTypeId, setGameTypeId] = useState<string>();
  const [period, setPeriod] = useState<Period>("week");
  const [controllerId, setControllerId] = useState("");

  const [options] = api.leaderboard.options.useSuspenseQuery();

  // Only offer locations whose grid fits the selected game.
  const selectedGame =
    options.games.find((game) => game.id === gameTypeId) ?? options.games[0];
  const controllers = options.controllers.filter(
    (controller) =>
      selectedGame &&
      controller.width >= selectedGame.requiredWidth &&
      controller.height >= selectedGame.requiredHeight,
  );
  const activeControllerId = controllers.some((c) => c.id === controllerId)
    ? controllerId
    : "";

  const list = api.leaderboard.list.useQuery(
    {
      gameTypeId,
      period,
      controllerId: activeControllerId || undefined,
    },
    { placeholderData: keepPreviousData },
  );
  const data = list.data;
  const scoreKind = data?.game?.scoreKind ?? "points";
  const podium = data?.entries.slice(0, 3) ?? [];
  const rest = data?.entries.slice(3) ?? [];

  if (options.games.length === 0) {
    return (
      <EmptyState icon="Gamepad">
        Noch gibt es keine Spiele mit Bestenliste. Schau bald wieder vorbei!
      </EmptyState>
    );
  }

  // Desktop: filters and own entry in a sticky sidebar, results beside it.
  return (
    <div className={boardClass}>
      <aside aria-label="Filter" className={sidebarClass}>
        <div role="group" aria-label="Spiel" className={gameTabsClass}>
          {options.games.map((game) => {
            const active = game.id === selectedGame?.id;
            return (
              <button
                key={game.id}
                type="button"
                aria-pressed={active}
                onClick={() => setGameTypeId(game.id)}
                className={`min-h-12 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors md:rounded-xl md:text-left md:whitespace-normal ${
                  active
                    ? "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan"
                    : "border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {game.name}
              </button>
            );
          })}
        </div>

        <div className={filtersClass}>
          <div className="flex flex-col gap-1">
            <span id="period-label" className="text-xs text-white/60">
              Zeitraum
            </span>
            <div
              role="group"
              aria-labelledby="period-label"
              className="bg-pixel-off grid min-h-12 grid-cols-3 gap-1 rounded-xl border border-white/10 p-1"
            >
              {periods.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={period === option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-lg text-xs font-semibold transition-colors ${
                    period === option.value
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <SelectField
            label="Standort"
            value={activeControllerId}
            onChange={(event) => setControllerId(event.target.value)}
          >
            <option value="">Alle Standorte</option>
            {controllers.map((controller) => (
              <option key={controller.id} value={controller.id}>
                {controller.name}
              </option>
            ))}
          </SelectField>
        </div>

        {data?.viewerEntry && (
          <OwnEntry
            entry={data.viewerEntry}
            scoreKind={scoreKind}
            className="hidden md:block"
          />
        )}
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        {list.isError && !data && (
          <ErrorState
            message="Die Bestenliste konnte nicht geladen werden."
            onRetry={() => void list.refetch()}
          />
        )}

        {!data && list.isPending && <RankingSkeleton />}

        {data?.entries.length === 0 && (
          <EmptyState icon="LeaderboardStar">
            Noch keine Einträge – sei die/der Erste!
          </EmptyState>
        )}

        {data && data.entries.length > 0 && (
          <div
            aria-busy={list.isPlaceholderData || undefined}
            className={`flex flex-col gap-6 transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}
          >
            <Podium
              entries={podium}
              scoreKind={scoreKind}
              viewerId={data.viewerId}
            />
            {rest.length > 0 && (
              <ol
                start={4}
                aria-label="Weitere Plätze"
                className="flex flex-col gap-1"
              >
                {rest.map((entry) => (
                  <RankRow
                    key={entry.player.id}
                    entry={entry}
                    scoreKind={scoreKind}
                    isViewer={entry.player.id === data.viewerId}
                  />
                ))}
              </ol>
            )}
          </div>
        )}

        {data && !data.viewerId && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 px-6 py-6 text-center">
            <p className="text-sm text-white/80">
              Du willst auch hier stehen? Melde dich an, dann kannst du deine
              Runden am Spielfeld speichern.
            </p>
            <Link
              href={SIGN_IN_HREF}
              className="border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/10 flex min-h-12 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors"
            >
              <DynamicIcon name="LogIn" size={20} />
              Anmelden
            </Link>
          </div>
        )}
      </div>

      {data?.viewerEntry && (
        <OwnEntry
          entry={data.viewerEntry}
          scoreKind={scoreKind}
          floating
          className="md:hidden"
        />
      )}
    </div>
  );
}

const boardClass =
  "flex flex-col gap-6 md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]";
const sidebarClass =
  "flex flex-col gap-6 md:sticky md:top-[calc(var(--header-h)+1.5rem)]";
const gameTabsClass =
  "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0";
const filtersClass =
  "grid grid-cols-[3fr_2fr] items-end gap-3 md:grid-cols-1 md:gap-4";

/** Placeholder for {@link LeaderboardBoard}: filters, podium and ranking. */
export function LeaderboardBoardSkeleton() {
  return (
    <div className={boardClass}>
      <div aria-hidden className={sidebarClass}>
        <div className={gameTabsClass}>
          {["w-32", "w-24", "w-28"].map((width) => (
            <Skeleton
              key={width}
              className={`h-12 shrink-0 rounded-full md:w-full md:rounded-xl ${width}`}
            />
          ))}
        </div>
        <div className={filtersClass}>
          {["Zeitraum", "Standort"].map((label) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-xs text-white/60">{label}</span>
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <RankingSkeleton />
    </div>
  );
}

/** Podium and a few rows, while the ranking of the selected filters loads. */
function RankingSkeleton() {
  return (
    <SkeletonGroup
      label="Bestenliste wird geladen"
      className="flex min-w-0 flex-col gap-6"
    >
      <PodiumSkeleton />
      <div className="flex flex-col gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 px-3 py-2">
            <Skeleton className="h-4 w-7 shrink-0" />
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
            <Skeleton className="h-4 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}

/** Placeholder for {@link Podium} with the same card sizes. */
export function PodiumSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-3">
      <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-white/10 p-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-32 max-w-full" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
        <Skeleton className="h-6 w-16 shrink-0" />
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 p-4"
        >
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-5 w-20 max-w-full" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-3 w-24 max-w-full" />
        </div>
      ))}
    </div>
  );
}

/** Places 1–3: first place framed like a live pad, second and third side by side. */
export function Podium({
  entries,
  scoreKind,
  viewerId,
}: {
  entries: Entry[];
  scoreKind: ScoreKind;
  viewerId: string | null;
}) {
  const [first, ...others] = entries;
  if (!first) return null;

  return (
    <ol aria-label="Podest" className="grid grid-cols-2 gap-3">
      <li className="col-span-2">
        <PixelFrame color="var(--color-neon-yellow)">
          <div className="bg-surface flex items-center gap-4 p-4">
            <Blobatar name={first.player.name} size={64} alt="" />
            <div className="min-w-0 flex-1">
              <p className="text-neon-yellow flex items-center gap-1 text-xs font-semibold tracking-wide uppercase">
                <DynamicIcon name="Crown" size={16} />
                Platz {first.rank}
              </p>
              <p className="truncate text-lg font-bold">
                {first.player.name}
                {first.player.id === viewerId && (
                  <span className="text-neon-cyan"> (Du)</span>
                )}
              </p>
              <p className="truncate text-xs text-white/60">
                {first.controller.name} · {formatDay(first.achievedAt)}
              </p>
            </div>
            <p className="shrink-0 text-right text-lg font-bold tabular-nums">
              {formatScore(first.score, scoreKind)}
            </p>
          </div>
        </PixelFrame>
      </li>
      {others.map((entry) => (
        <li
          key={entry.player.id}
          className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${
            entry.player.id === viewerId
              ? "border-neon-cyan/50 bg-neon-cyan/5"
              : "border-white/10"
          }`}
        >
          <Blobatar name={entry.player.name} size={44} alt="" />
          <p className="flex items-center gap-1 text-xs font-semibold tracking-wide text-white/60 uppercase">
            <DynamicIcon name="Medal" size={16} />
            Platz {entry.rank}
          </p>
          <p className="w-full truncate font-bold">
            {entry.player.name}
            {entry.player.id === viewerId && (
              <span className="text-neon-cyan"> (Du)</span>
            )}
          </p>
          <p className="text-sm tabular-nums">
            {formatScore(entry.score, scoreKind)}
          </p>
          <p className="w-full truncate text-xs text-white/50">
            {entry.controller.name}
          </p>
        </li>
      ))}
    </ol>
  );
}

function RankRow({
  entry,
  scoreKind,
  isViewer,
  compact = false,
  className = "",
}: {
  entry: Entry;
  scoreKind: ScoreKind;
  isViewer: boolean;
  /** Keep location and date in the second line even on wide screens. */
  compact?: boolean;
  className?: string;
}) {
  // Wide screens show location and date as their own columns.
  const wide = !compact;
  return (
    <li
      aria-current={isViewer || undefined}
      className={`flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 ${
        isViewer ? "bg-neon-cyan/10 ring-neon-cyan/40 ring-1" : ""
      } ${className}`}
    >
      <span className="w-7 shrink-0 text-right text-sm font-bold text-white/60 tabular-nums">
        {entry.rank}
      </span>
      <Blobatar name={entry.player.name} size={32} alt="" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {entry.player.name}
          {isViewer && <span className="text-neon-cyan"> (Du)</span>}
        </p>
        <p
          className={`truncate text-xs text-white/50 ${wide ? "lg:hidden" : ""}`}
        >
          {entry.controller.name} · {formatDay(entry.achievedAt)}
        </p>
      </div>
      {wide && (
        <>
          <span className="hidden w-44 shrink-0 truncate text-sm text-white/60 lg:block">
            {entry.controller.name}
          </span>
          <span className="hidden w-24 shrink-0 text-sm text-white/50 lg:block">
            {formatDay(entry.achievedAt)}
          </span>
        </>
      )}
      <span
        className={`shrink-0 text-right text-sm font-semibold tabular-nums ${wide ? "lg:w-24" : ""}`}
      >
        {formatScore(entry.score, scoreKind)}
      </span>
    </li>
  );
}

/**
 * The viewer's best entry: pinned in thumb reach above the BottomBar on
 * mobile (`floating`), in the sidebar on desktop.
 */
function OwnEntry({
  entry,
  scoreKind,
  floating = false,
  className = "",
}: {
  entry: Entry;
  scoreKind: ScoreKind;
  floating?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${floating ? "fixed inset-x-0 bottom-[calc(var(--bottombar-h)+0.75rem)] z-30 mx-auto w-full max-w-md px-4" : ""} ${className}`}
    >
      <p
        className={
          floating
            ? "sr-only"
            : "mb-2 text-xs font-semibold tracking-wide text-white/60 uppercase"
        }
      >
        Dein bester Eintrag
      </p>
      <PixelFrame color="var(--color-neon-cyan)">
        <div className="bg-surface">
          <ol>
            <RankRow
              entry={entry}
              scoreKind={scoreKind}
              isViewer={false}
              compact
              className="rounded-none"
            />
          </ol>
        </div>
      </PixelFrame>
    </div>
  );
}
