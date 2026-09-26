import { randomInt } from "node:crypto";

import {
  clearClaimPatternOn,
  getGridSize,
  isControllerOnline,
  showClaimPatternOn,
} from "wbl/server/bridge";
import { db as defaultDb } from "wbl/server/db";
import { CLAIM_COLORS, CLAIM_PATTERN_TTL_MS } from "wbl/utils/claim";
import { type DbClient, sanitizeId, ServiceError } from "./common";

/*
 * Claiming a game proves that someone stood at the pad right after the round:
 * the pad shows a random two-color pattern and the player taps it into the
 * app. Claims are not exclusive, so everyone who played can claim the same
 * round, and one pattern per pad is shared by everyone claiming at the moment.
 *
 * Only the latest round of a pad can be claimed, and only until the next one
 * starts. Patterns live in memory: a server restart just asks for a new one.
 * The pad shows them via `claimShow` and restores its display on its own.
 */

/** Pattern edge length; smaller pads use their full grid. */
const PATTERN_SIZE = 3;
/** Each color appears at least this often, so patterns aren't a single blob. */
const MIN_CELLS_PER_COLOR = 2;
const MAX_WRONG_ATTEMPTS = 5;
/** Caps guessing: every new pattern grants another {@link MAX_WRONG_ATTEMPTS}. */
const MAX_PATTERNS_PER_GAME = 5;

/** Why the latest round of a pad can't be claimed right now. */
export type ClaimBlocker = "offline" | "playing" | "noGame";

interface Challenge {
  gameId: string;
  width: number;
  height: number;
  /** Row-major color indexes into {@link CLAIM_COLORS}. */
  pattern: number[];
  expiresAt: Date;
  wrongAttempts: number;
  timer: ReturnType<typeof setTimeout>;
}

interface ClaimState {
  /** Active pattern per controller ID. */
  challenges: Map<string, Challenge>;
  /** Patterns shown for the latest round per controller ID. */
  patternCounts: Map<string, { gameId: string; count: number }>;
}

// On globalThis like the bridge: server.js and the Next bundle share it.
const globalForClaims = globalThis as unknown as { claimState?: ClaimState };
const state: ClaimState = (globalForClaims.claimState ??= {
  challenges: new Map<string, Challenge>(),
  patternCounts: new Map<string, { gameId: string; count: number }>(),
});

/** Latest round of a pad, running or ended. */
function findLatestGame(controllerId: string, db: DbClient) {
  return db.game.findFirst({
    where: { controllerId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      gameType: { select: { name: true } },
      // History of color changes, oldest first.
      data: {
        orderBy: { id: "asc" },
        select: { x: true, y: true, colorHex: true },
      },
    },
  });
}

async function findController(rawId: string, db: DbClient) {
  const controller = await db.controller.findUnique({
    where: { id: sanitizeId(rawId, "controllerId") },
    select: {
      id: true,
      hardwareId: true,
      name: true,
      location: true,
      width: true,
      height: true,
    },
  });
  if (!controller) throw new ServiceError("NOT_FOUND", "Controller not found");
  return controller;
}

function activeChallenge(controllerId: string, now: Date) {
  const challenge = state.challenges.get(controllerId);
  if (!challenge || challenge.expiresAt <= now) return null;
  return challenge;
}

/**
 * Forgets a pad's pattern. Unless it expired on its own, the pad is told to
 * drop it; the pad restores its display either way.
 */
function endChallenge(controllerId: string, { expired = false } = {}) {
  const challenge = state.challenges.get(controllerId);
  if (!challenge) return;
  clearTimeout(challenge.timer);
  state.challenges.delete(controllerId);
  if (!expired) clearClaimPatternOn({ id: controllerId });
}

/** Random pattern with both colors, row-major. */
function randomPattern(length: number) {
  const minPerColor = Math.min(MIN_CELLS_PER_COLOR, Math.floor(length / 2));
  for (;;) {
    const pattern = Array.from({ length }, () => randomInt(2));
    const ones = pattern.reduce((sum, cell) => sum + cell, 0);
    if (ones >= minPerColor && length - ones >= minPerColor) return pattern;
  }
}

/** Rotates a square row-major pattern by 90° clockwise. */
function rotate(pattern: readonly number[], size: number) {
  return Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    return pattern[(size - 1 - x) * size + y]!;
  });
}

/**
 * Whether the input matches the pattern. Square patterns also match when
 * rotated, since players may look at the pad from any side.
 */
function matchesPattern(
  challenge: Challenge,
  input: readonly number[],
): boolean {
  const equals = (candidate: readonly number[]) =>
    candidate.length === input.length &&
    candidate.every((cell, i) => cell === input[i]);

  if (challenge.width !== challenge.height) return equals(challenge.pattern);
  let candidate = challenge.pattern;
  for (let turn = 0; turn < 4; turn++) {
    if (equals(candidate)) return true;
    candidate = rotate(candidate, challenge.width);
  }
  return false;
}

/**
 * Pads to claim a round at, for the pad picker.
 *
 * @param db - Optional database client.
 * @returns All controllers by name.
 */
export function listClaimPads(db: DbClient = defaultDb) {
  return db.controller.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });
}

/**
 * The round that can be claimed at a pad right now.
 *
 * @param rawControllerId - The ID of the pad.
 * @param now - The current time.
 * @param db - Optional database client.
 * @returns The pad, its latest round if claimable, why not otherwise, and
 * when the pattern currently on the pad expires.
 * @throws {ServiceError} `NOT_FOUND` if the pad doesn't exist.
 */
export async function getClaimTarget(
  rawControllerId: string,
  now = new Date(),
  db: DbClient = defaultDb,
) {
  const { id, name, location, width, height } = await findController(
    rawControllerId,
    db,
  );
  const controller = { id, name, location, width, height };
  const latest = await findLatestGame(controller.id, db);

  const blocker: ClaimBlocker | null = !isControllerOnline(controller)
    ? "offline"
    : !latest
      ? "noGame"
      : !latest.endedAt
        ? "playing"
        : null;

  const challenge = activeChallenge(controller.id, now);
  return {
    controller,
    blocker,
    game:
      latest?.endedAt && !blocker
        ? { ...latest, endedAt: latest.endedAt }
        : null,
    patternExpiresAt:
      challenge && challenge.gameId === latest?.id ? challenge.expiresAt : null,
  };
}

/**
 * Shows a claim pattern on the pad, or keeps the one already shown there so
 * several players can claim the same round at once.
 *
 * @param rawControllerId - The ID of the pad.
 * @param now - The current time.
 * @param db - Optional database client.
 * @returns The claimable round, pattern size and when the pattern expires.
 * @throws {ServiceError} `NOT_FOUND` if the pad doesn't exist, `CONFLICT` if
 * the pad is offline, in the next round, never played, or showed too many
 * patterns for this round.
 */
export async function showClaimPattern(
  rawControllerId: string,
  now = new Date(),
  db: DbClient = defaultDb,
) {
  const controller = await findController(rawControllerId, db);
  const latest = await findLatestGame(controller.id, db);
  if (!latest) {
    throw new ServiceError("CONFLICT", "No game played at this pad yet");
  }
  if (!latest.endedAt) {
    endChallenge(controller.id);
    throw new ServiceError("CONFLICT", "The next game is already running");
  }

  const existing = activeChallenge(controller.id, now);
  if (existing?.gameId === latest.id) {
    return {
      gameId: latest.id,
      width: existing.width,
      height: existing.height,
      expiresAt: existing.expiresAt,
    };
  }
  endChallenge(controller.id);

  const counted = state.patternCounts.get(controller.id);
  const count = counted?.gameId === latest.id ? counted.count : 0;
  if (count >= MAX_PATTERNS_PER_GAME) {
    throw new ServiceError("CONFLICT", "Too many patterns for this game");
  }

  if (!isControllerOnline(controller)) {
    throw new ServiceError("CONFLICT", "Controller is offline");
  }

  const { width: padWidth, height: padHeight } = getGridSize(controller);
  const width = Math.min(PATTERN_SIZE, padWidth);
  const height = Math.min(PATTERN_SIZE, padHeight);
  const offsetX = Math.floor((padWidth - width) / 2);
  const offsetY = Math.floor((padHeight - height) / 2);
  const pattern = randomPattern(width * height);

  const sent = showClaimPatternOn(controller, {
    x: offsetX,
    y: offsetY,
    width,
    height,
    colors: pattern.map((colorIndex) => CLAIM_COLORS[colorIndex]!.hex),
    durationMs: CLAIM_PATTERN_TTL_MS,
  });
  if (!sent) throw new ServiceError("CONFLICT", "Controller is offline");

  const expiresAt = new Date(now.getTime() + CLAIM_PATTERN_TTL_MS);
  state.challenges.set(controller.id, {
    gameId: latest.id,
    width,
    height,
    pattern,
    expiresAt,
    wrongAttempts: 0,
    timer: setTimeout(
      () => endChallenge(controller.id, { expired: true }),
      CLAIM_PATTERN_TTL_MS,
    ),
  });
  state.patternCounts.set(controller.id, {
    gameId: latest.id,
    count: count + 1,
  });

  return { gameId: latest.id, width, height, expiresAt };
}

/** Result of {@link verifyClaimPattern}. */
export type ClaimResult =
  | { ok: true; gameId: string; savedToHistory: boolean }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "expired" | "tooManyAttempts" };

/**
 * Checks a pattern typed in by a player. On a match, a signed-in player gets
 * the round added to their history; everyone gets its ID to view it.
 *
 * @param input - The pad, the round the pattern was shown for and the typed
 * pattern as row-major color indexes.
 * @param userId - The signed-in player, or `null`.
 * @param now - The current time.
 * @param db - Optional database client.
 * @returns Whether it matched; otherwise why not and the attempts left.
 * @throws {ServiceError} `BAD_REQUEST` for invalid IDs.
 */
export async function verifyClaimPattern(
  input: { controllerId: string; gameId: string; pattern: number[] },
  userId: string | null,
  now = new Date(),
  db: DbClient = defaultDb,
): Promise<ClaimResult> {
  const controllerId = sanitizeId(input.controllerId, "controllerId");
  const gameId = sanitizeId(input.gameId, "gameId");

  const challenge = activeChallenge(controllerId, now);
  if (challenge?.gameId !== gameId) return { ok: false, reason: "expired" };

  // The next round may have started since the pattern was shown.
  const latest = await findLatestGame(controllerId, db);
  if (latest?.id !== gameId || !latest.endedAt) {
    endChallenge(controllerId);
    return { ok: false, reason: "expired" };
  }

  if (!matchesPattern(challenge, input.pattern)) {
    challenge.wrongAttempts++;
    const attemptsLeft = MAX_WRONG_ATTEMPTS - challenge.wrongAttempts;
    if (attemptsLeft <= 0) {
      endChallenge(controllerId);
      return { ok: false, reason: "tooManyAttempts" };
    }
    return { ok: false, reason: "wrong", attemptsLeft };
  }

  if (userId) {
    await db.gameClaim.upsert({
      where: { gameId_userId: { gameId, userId } },
      create: { gameId, userId },
      update: {},
    });
  }
  return { ok: true, gameId, savedToHistory: userId !== null };
}

/**
 * An ended round for its public page. Anyone with the link may view it, like
 * an unlisted video; running rounds stay hidden.
 *
 * @param rawId - The ID of the round.
 * @param viewerId - The signed-in viewer, or `null`.
 * @param db - Optional database client.
 * @returns The round with pad, game type, cells and whether the viewer claimed it.
 * @throws {ServiceError} `NOT_FOUND` if it doesn't exist or is still running.
 */
export async function getPublicGame(
  rawId: string,
  viewerId: string | null,
  db: DbClient = defaultDb,
) {
  const game = await db.game.findUnique({
    where: { id: sanitizeId(rawId) },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      controller: {
        select: {
          id: true,
          name: true,
          location: true,
          width: true,
          height: true,
        },
      },
      gameType: { select: { name: true, key: true } },
      // History of color changes, oldest first.
      data: {
        orderBy: { id: "asc" },
        select: { x: true, y: true, colorHex: true, createdAt: true },
      },
      claims: viewerId
        ? { where: { userId: viewerId }, select: { claimedAt: true } }
        : false,
    },
  });
  if (!game?.endedAt) throw new ServiceError("NOT_FOUND", "Game not found");

  const { claims, ...rest } = game;
  return {
    ...rest,
    endedAt: game.endedAt,
    claimedAt: claims?.[0]?.claimedAt ?? null,
  };
}

/**
 * Rounds a player claimed, newest claim first.
 *
 * @param userId - The signed-in player.
 * @param db - Optional database client.
 * @returns The rounds with pad, game type and final cells.
 */
export async function listClaimedGames(
  userId: string,
  db: DbClient = defaultDb,
) {
  const claims = await db.gameClaim.findMany({
    where: { userId },
    orderBy: { claimedAt: "desc" },
    select: {
      claimedAt: true,
      game: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          controller: {
            select: { name: true, width: true, height: true },
          },
          gameType: { select: { name: true } },
          data: {
            orderBy: { id: "asc" },
            select: { x: true, y: true, colorHex: true },
          },
        },
      },
    },
  });
  return claims.map(({ claimedAt, game }) => ({ ...game, claimedAt }));
}
