import { db } from "wbl/server/db";
import {
  getLiveController,
  isControllerConnected,
  sendToController,
} from "wbl/server/ws/live.js";
import type { Controller } from "../../../generated/prisma";

/**
 * Whether the controller currently has an open WebSocket connection.
 *
 * @param controller - The controller to check.
 * @returns `false` if the controller is offline or has never connected.
 */
export function isControllerOnline(
  controller: Pick<Controller, "id">,
): boolean {
  return isControllerConnected(controller.id);
}

/** Overall state of a controller. */
export enum ControllerState {
  IDLE = "idle",
  RUNNING = "running",
  ERROR = "error",
  OFFLINE = "offline",
}

/**
 * Determines the current state of a controller. Never throws: failures are
 * logged and reported as `ERROR`.
 *
 * @param controller - The controller to check.
 * @returns `OFFLINE` if it is not connected, `RUNNING` if a game has a start but no
 * end time, otherwise `IDLE`.
 */
export async function getControllerState(
  controller: Controller,
): Promise<ControllerState> {
  try {
    if (!isControllerOnline(controller)) return ControllerState.OFFLINE;

    const runningGame = await db.game.findFirst({
      where: { controllerId: controller.id, endedAt: null },
      select: { id: true },
    });

    return runningGame ? ControllerState.RUNNING : ControllerState.IDLE;
  } catch (error) {
    console.error(`Failed to get state of controller ${controller.id}:`, error);
    return ControllerState.ERROR;
  }
}

/**
 * Live view of a controller for the admin area, built from the `change`
 * messages it sent since it last connected.
 *
 * @param controller - The controller to show.
 * @returns Online status, overall state, grid size and the panel colors row
 * by row; all panels are `null` until the controller reports them.
 */
export async function getLiveState(controller: Controller) {
  const state = await getControllerState(controller);
  const live = getLiveController(controller.id);
  return {
    online: isControllerOnline(controller),
    state,
    width: live?.width ?? controller.width,
    height: live?.height ?? controller.height,
    pixels: live?.panels.flat() ?? [],
  };
}

/** Converts `#RRGGBB` to the `rgb(r, g, b)` form controllers use. */
function toRgb(colorHex: string) {
  const channels = [1, 3, 5].map((i) => parseInt(colorHex.slice(i, i + 2), 16));
  return `rgb(${channels.join(", ")})`;
}

/**
 * Grid size of a controller: as reported in its last `hello`, else as stored.
 *
 * @param controller - The controller.
 * @returns The width and height in panels.
 */
export function getGridSize(
  controller: Pick<Controller, "id" | "width" | "height">,
) {
  const live = getLiveController(controller.id);
  return {
    width: live?.width ?? controller.width,
    height: live?.height ?? controller.height,
  };
}

/** A claim pattern placed on a controller's grid. */
export interface ClaimPatternDisplay {
  /** Column and row of the pattern's top-left panel. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Row-major `#RRGGBB` colors, `width * height` of them. */
  colors: string[];
  /** How long to show it; the controller then restores its own display. */
  durationMs: number;
}

/**
 * Sends `claimShow`: the controller shows the pattern over its display until
 * `durationMs` passed or `claimClear` arrives, then restores what it showed.
 *
 * @param controller - The controller.
 * @param pattern - Where and what to show.
 * @returns `false` if the controller is not connected.
 */
export function showClaimPatternOn(
  controller: Pick<Controller, "id">,
  pattern: ClaimPatternDisplay,
) {
  return sendToController(controller.id, {
    msgType: "claimShow",
    ...pattern,
    colors: pattern.colors.map(toRgb),
  });
}

/**
 * Sends `claimClear`: the controller drops the pattern early.
 *
 * @param controller - The controller.
 * @returns `false` if the controller is not connected.
 */
export function clearClaimPatternOn(controller: Pick<Controller, "id">) {
  return sendToController(controller.id, { msgType: "claimClear" });
}
