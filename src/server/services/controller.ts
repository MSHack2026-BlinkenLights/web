import { announcePadChange } from "wbl/server/bridge";
import { db as defaultDb } from "wbl/server/db";
import {
  type DbClient,
  sanitizeCoordinate,
  sanitizeHardwareId,
  sanitizeId,
  sanitizeName,
  ServiceError,
} from "./common";

export interface ControllerInput {
  hardwareId: number;
  name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Sanitized data ready for `db.controller.create`. The grid size is reported
 * by the hardware on `hello`, so it starts out as 0×0.
 */
export function sanitizeControllerInput(input: ControllerInput) {
  return {
    hardwareId: sanitizeHardwareId(input.hardwareId),
    name: sanitizeName(input.name, "name", 100),
    location: sanitizeName(input.location, "location", 200),
    width: 0,
    height: 0,
    latitude: sanitizeCoordinate(input.latitude, "latitude", 90),
    longitude: sanitizeCoordinate(input.longitude, "longitude", 180),
  };
}

/** Sanitized data ready for `db.controller.update`; only given fields are included. */
export function sanitizeControllerUpdate(input: Partial<ControllerInput>) {
  return {
    ...(input.hardwareId !== undefined && {
      hardwareId: sanitizeHardwareId(input.hardwareId),
    }),
    ...(input.name !== undefined && {
      name: sanitizeName(input.name, "name", 100),
    }),
    ...(input.location !== undefined && {
      location: sanitizeName(input.location, "location", 200),
    }),
    ...(input.latitude !== undefined && {
      latitude: sanitizeCoordinate(input.latitude, "latitude", 90),
    }),
    ...(input.longitude !== undefined && {
      longitude: sanitizeCoordinate(input.longitude, "longitude", 180),
    }),
  };
}

/**
 * Looks up a controller by the ID its hardware identifies itself with.
 *
 * @param rawHardwareId - The controller's hardware ID.
 * @param db - The client to use, e.g. a transaction.
 * @returns The controller.
 * @throws {ServiceError} `BAD_REQUEST` for an invalid ID, `NOT_FOUND` if no controller has it.
 */
export async function findControllerByHardwareId(
  rawHardwareId: number,
  db: DbClient = defaultDb,
) {
  const hardwareId = sanitizeHardwareId(rawHardwareId);
  const controller = await db.controller.findUnique({ where: { hardwareId } });
  if (!controller) throw new ServiceError("NOT_FOUND", "Controller not found");
  return controller;
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
  announcePadChange(id);
}
