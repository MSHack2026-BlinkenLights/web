import { db as defaultDb } from "wbl/server/db";
import {
  type DbClient,
  sanitizeId,
  sanitizeName,
  sanitizeOptionalText,
  sanitizeSmallInt,
  ServiceError,
} from "./common";

export interface GameTypeInput {
  name: string;
  description?: string | null;
  requiredWidth: number;
  requiredHeight: number;
  minPlayers: number;
  maxPlayers: number;
}

/** Sanitized data ready for `db.gameType.create`. */
export function sanitizeGameTypeInput(input: GameTypeInput) {
  const data = {
    name: sanitizeName(input.name, "name", 100),
    description: sanitizeOptionalText(input.description),
    requiredWidth: sanitizeSmallInt(input.requiredWidth, "requiredWidth", 1),
    requiredHeight: sanitizeSmallInt(input.requiredHeight, "requiredHeight", 1),
    minPlayers: sanitizeSmallInt(input.minPlayers, "minPlayers", 1),
    maxPlayers: sanitizeSmallInt(input.maxPlayers, "maxPlayers", 1),
  };
  if (data.minPlayers > data.maxPlayers) {
    throw new ServiceError("BAD_REQUEST", "minPlayers must be <= maxPlayers");
  }
  return data;
}

/**
 * Sanitized data ready for `db.gameType.update`. Needs the current row so a
 * partial update can't break minPlayers <= maxPlayers.
 */
export function sanitizeGameTypeUpdate(
  current: GameTypeInput,
  patch: Partial<GameTypeInput>,
) {
  // Drop undefined keys so they don't overwrite current values in the merge.
  const keys = Object.keys(patch).filter(
    (key) => patch[key as keyof GameTypeInput] !== undefined,
  ) as (keyof GameTypeInput)[];
  const merged = sanitizeGameTypeInput({
    ...current,
    ...Object.fromEntries(keys.map((key) => [key, patch[key]])),
  });
  return Object.fromEntries(keys.map((key) => [key, merged[key]])) as Partial<
    typeof merged
  >;
}

/** Deletes a game type, with a clear error instead of a foreign key violation if games reference it. */
export async function deleteGameType(rawId: string, db: DbClient = defaultDb) {
  const id = sanitizeId(rawId);
  const games = await db.game.count({ where: { gameTypeId: id } });
  if (games > 0) {
    throw new ServiceError(
      "CONFLICT",
      `Game type still has ${games} game(s); delete them first`,
    );
  }
  const { count } = await db.gameType.deleteMany({ where: { id } });
  if (count === 0) throw new ServiceError("NOT_FOUND", "Game type not found");
}
