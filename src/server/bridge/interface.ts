import { db } from "wbl/server/db";
import {
  getLiveController,
  isControllerConnected,
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
