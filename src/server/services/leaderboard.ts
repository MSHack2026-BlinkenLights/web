import { db as defaultDb } from "wbl/server/db";
import { startOfBerlinDay } from "wbl/utils/time";
import { type DbClient, sanitizeId } from "./common";

/*
 * Highscores are MOCK DATA: pads don't report scores yet and there is no score
 * model. Everything mock lives in this file, behind the same shape the real
 * implementation will return, so the UI won't change once scores are stored.
 *
 * Planned model: playing never requires an account. A score is only listed
 * once a signed-in player claims it (e.g. via a QR code shown after the round).
 * Unclaimed rounds still count towards the city stats below, which already
 * use real data.
 */

const DAY = 24 * 60 * 60 * 1000;

export const LEADERBOARD_PERIODS = ["today", "week", "all"] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

/** How a game is ranked. Higher is better for both. */
export type ScoreKind = "points" | "wins";

// Mock until GameType gets a score kind column. Keyed by seed ids; null means
// the game has no winner (free painting) and gets no leaderboard.
const MOCK_SCORE_KINDS: Record<string, ScoreKind | null> = {
  "01990000-0000-7000-8000-000000000101": null,
  "01990000-0000-7000-8000-000000000102": "wins",
};

function scoreKindOf(gameTypeId: string): ScoreKind | null {
  return MOCK_SCORE_KINDS[gameTypeId] === undefined
    ? "points"
    : (MOCK_SCORE_KINDS[gameTypeId] ?? null);
}

/** Games with a leaderboard and all locations, for tabs and filters. */
export async function getLeaderboardOptions(db: DbClient = defaultDb) {
  const [gameTypes, controllers] = await Promise.all([
    db.gameType.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        requiredWidth: true,
        requiredHeight: true,
      },
    }),
    db.controller.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, width: true, height: true },
    }),
  ]);
  return {
    games: gameTypes.flatMap((gameType) => {
      const scoreKind = scoreKindOf(gameType.id);
      return scoreKind ? [{ ...gameType, scoreKind }] : [];
    }),
    controllers,
  };
}

export interface LeaderboardEntry {
  rank: number;
  player: { id: string; name: string };
  score: number;
  controller: { id: string; name: string };
  achievedAt: Date;
}

const MOCK_NAMES = [
  "Pixelpia",
  "Leezenkönig",
  "Aasee-Ass",
  "Hafenblitz",
  "Domspatz",
  "Kiepenkerl",
  "Lambertus",
  "Promenadenpro",
  "Nieselnina",
  "Glühwürmchen",
  "Mimi M.",
  "Tobi_07",
  "Kreativkai",
  "Schlossgeist",
  "Giebelgirl",
  "Radlerin",
  "Jojo",
  "Neonnils",
  "Sprinkler",
  "Kuhviertel-Kid",
  "Arkadenaya",
  "LED-Lotte",
  "Hüpfhelge",
  "Münsterlicht",
  "Blinki",
  "Pinkus",
  "Lilli L.",
  "Maulwurfjäger",
  "Bennet",
  "Kanalkapitän",
];

/** Small deterministic PRNG, so the mock list stays stable across refetches. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

/** Best score per player, highest first, with shared ranks for ties. */
export async function getLeaderboard(
  input: {
    gameTypeId?: string;
    period: LeaderboardPeriod;
    controllerId?: string;
  },
  viewer: { id: string; name: string } | null,
  now = new Date(),
  db: DbClient = defaultDb,
) {
  const { games } = await getLeaderboardOptions(db);
  const gameTypeId =
    input.gameTypeId && sanitizeId(input.gameTypeId, "gameTypeId");
  // Without a choice, the first game is shown, as in the tabs.
  const game = gameTypeId ? games.find((g) => g.id === gameTypeId) : games[0];
  const controllerId =
    input.controllerId && sanitizeId(input.controllerId, "controllerId");

  if (!game) {
    return { game: null, entries: [], viewerEntry: null };
  }

  // Only locations whose grid fits the game.
  const controllers = await db.controller.findMany({
    where: {
      width: { gte: game.requiredWidth },
      height: { gte: game.requiredHeight },
      ...(controllerId && { id: controllerId }),
    },
    select: { id: true, name: true },
  });

  const periodStart =
    input.period === "today"
      ? startOfBerlinDay(now).getTime()
      : now.getTime() - (input.period === "week" ? 7 : 90) * DAY;
  const dayKey = startOfBerlinDay(now).toISOString();
  const seed = (salt: string) =>
    hashString(
      [game.id, input.period, controllerId ?? "all", dayKey, salt].join("|"),
    );

  const mockScore = (random: () => number) =>
    game.scoreKind === "wins"
      ? 1 + Math.floor(random() ** 2 * (input.period === "all" ? 60 : 20))
      : 10 * Math.round(50 + random() ** 2 * 480);
  const mockResult = (random: () => number) => ({
    score: mockScore(random),
    controller: controllers[Math.floor(random() * controllers.length)]!,
    achievedAt: new Date(
      periodStart + random() * (now.getTime() - periodStart),
    ),
  });

  const random = mulberry32(seed("players"));
  const playerCount = controllers.length
    ? Math.round(
        { today: 5, week: 14, all: 30 }[input.period] *
          (controllerId ? 0.5 : 1),
      )
    : 0;
  const results = MOCK_NAMES.slice(0, playerCount).map((name, i) => ({
    player: { id: `mock-${i}`, name },
    ...mockResult(random),
  }));
  // Signed-in viewers get a mock score too, to show the own-entry row.
  if (viewer && controllers.length) {
    results.push({
      player: viewer,
      ...mockResult(mulberry32(seed(viewer.id))),
    });
  }

  results.sort(
    (a, b) =>
      b.score - a.score || a.achievedAt.getTime() - b.achievedAt.getTime(),
  );
  const ranked: LeaderboardEntry[] = [];
  for (const [i, result] of results.entries()) {
    const previous = ranked[i - 1];
    const rank = previous?.score === result.score ? previous.rank : i + 1;
    ranked.push({ rank, ...result });
  }

  return {
    game,
    entries: ranked.slice(0, 50),
    viewerEntry: ranked.find((e) => e.player.id === viewer?.id) ?? null,
  };
}

/**
 * City-wide activity from real games, including rounds played without an
 * account: rounds today, plus the most played game and busiest location of
 * the last 7 days.
 */
export async function getCityStats(now = new Date(), db: DbClient = defaultDb) {
  const weekStart = new Date(now.getTime() - 7 * DAY);
  const [roundsToday, roundsThisWeek, topGame, topController] =
    await Promise.all([
      db.game.count({
        where: { startedAt: { gte: startOfBerlinDay(now), lte: now } },
      }),
      db.game.count({ where: { startedAt: { gte: weekStart, lte: now } } }),
      db.game.groupBy({
        by: ["gameTypeId"],
        where: { startedAt: { gte: weekStart, lte: now } },
        _count: { _all: true },
        orderBy: [{ _count: { gameTypeId: "desc" } }, { gameTypeId: "asc" }],
        take: 1,
      }),
      db.game.groupBy({
        by: ["controllerId"],
        where: { startedAt: { gte: weekStart, lte: now } },
        _count: { _all: true },
        orderBy: [
          { _count: { controllerId: "desc" } },
          { controllerId: "asc" },
        ],
        take: 1,
      }),
    ]);

  const [gameType, controller] = await Promise.all([
    topGame[0] &&
      db.gameType.findUnique({
        where: { id: topGame[0].gameTypeId },
        select: { id: true, name: true },
      }),
    topController[0] &&
      db.controller.findUnique({
        where: { id: topController[0].controllerId },
        select: { id: true, name: true },
      }),
  ]);

  return {
    roundsToday,
    roundsThisWeek,
    topGame:
      gameType && topGame[0]
        ? { ...gameType, rounds: topGame[0]._count._all }
        : null,
    topController:
      controller && topController[0]
        ? { ...controller, rounds: topController[0]._count._all }
        : null,
  };
}
