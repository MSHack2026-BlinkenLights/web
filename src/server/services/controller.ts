import { db as defaultDb } from "wbl/server/db";
import {
  type DbClient,
  sanitizeId,
  sanitizeName,
  sanitizeSmallInt,
  ServiceError,
} from "./common";

export interface ControllerInput {
  name: string;
  location: string;
  width: number;
  height: number;
}

/** Sanitized data ready for `db.controller.create`. */
export function sanitizeControllerInput(input: ControllerInput) {
  return {
    name: sanitizeName(input.name, "name", 100),
    location: sanitizeName(input.location, "location", 200),
    width: sanitizeSmallInt(input.width, "width", 1),
    height: sanitizeSmallInt(input.height, "height", 1),
  };
}

/** Sanitized data ready for `db.controller.update`; only given fields are included. */
export function sanitizeControllerUpdate(input: Partial<ControllerInput>) {
  return {
    ...(input.name !== undefined && {
      name: sanitizeName(input.name, "name", 100),
    }),
    ...(input.location !== undefined && {
      location: sanitizeName(input.location, "location", 200),
    }),
    ...(input.width !== undefined && {
      width: sanitizeSmallInt(input.width, "width", 1),
    }),
    ...(input.height !== undefined && {
      height: sanitizeSmallInt(input.height, "height", 1),
    }),
  };
}

/** Deletes a controller, with a clear error instead of a foreign key violation if games reference it. */
export async function deleteController(
  rawId: string,
  db: DbClient = defaultDb,
) {
  const id = sanitizeId(rawId);
  const games = await db.game.count({ where: { controllerId: id } });
  if (games > 0) {
    throw new ServiceError(
      "CONFLICT",
      `Controller still has ${games} game(s); delete them first`,
    );
  }
  const { count } = await db.controller.deleteMany({ where: { id } });
  if (count === 0) throw new ServiceError("NOT_FOUND", "Controller not found");
}
