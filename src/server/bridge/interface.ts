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

/**
 * Tells a controller to set a panel to a color by sending it a `change`
 * message. The live view updates once the controller reports the change back.
 *
 * @param controller - The controller that owns the panel.
 * @param x - The panel's column, starting at 0.
 * @param y - The panel's row, starting at 0.
 * @param color - The new color as `"#RRGGBB"`; `"#000000"` turns the panel off.
 * @returns `false` if the controller is offline.
 * @throws {RangeError} If the panel is outside the grid or the color is not `"#RRGGBB"`.
 */
export function setColor(
  controller: Pick<Controller, "id" | "width" | "height">,
  x: number,
  y: number,
  color: string,
): boolean {
  const live = getLiveController(controller.id);
  const width = live?.width ?? controller.width;
  const height = live?.height ?? controller.height;
  if (!Number.isInteger(x) || x < 0 || x >= width) {
    throw new RangeError(`x must be an integer between 0 and ${width - 1}`);
  }
  if (!Number.isInteger(y) || y < 0 || y >= height) {
    throw new RangeError(`y must be an integer between 0 and ${height - 1}`);
  }
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!hex) throw new RangeError('color must look like "#RRGGBB"');

  const [r, g, b] = hex.slice(1).map((channel) => parseInt(channel, 16));
  return sendToController(controller.id, {
    msgType: "change",
    x,
    y,
    color: `rgb(${r}, ${g}, ${b})`,
  });
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
