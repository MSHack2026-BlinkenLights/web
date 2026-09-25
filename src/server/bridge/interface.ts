import { EventEmitter } from "node:events";

import { db } from "wbl/server/db";
import { ServiceError } from "wbl/server/services/common";
import { setPixel } from "wbl/server/services/game-data";
import type { Controller } from "../../../generated/prisma";
import { bridge, panelColorToHex } from "./dummy-bridge";

/**
 * Whether the controller is currently connected to the bridge.
 *
 * @param controller - The controller to check.
 * @returns `false` if the controller is offline or has never connected.
 */
export function isControllerOnline(controller: Controller): boolean {
  return bridge.isOnline(controller.id);
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

/** A panel press or release. */
export interface PanelEvent {
  controllerId: string;
  x: number;
  y: number;
  at: Date;
}

type PanelEvents = {
  panelDown: [PanelEvent];
  panelUp: [PanelEvent];
};

const globalForPanels = globalThis as unknown as {
  panelEvents?: EventEmitter<PanelEvents>;
};

/**
 * Emits `panelDown` and `panelUp` for every panel press and release.
 *
 * @example
 * panelEvents.on("panelDown", ({ controllerId, x, y }) => { ... });
 */
export const panelEvents = (globalForPanels.panelEvents ??=
  new EventEmitter<PanelEvents>());

function toPanelEvent(controllerId: string, x: number, y: number): PanelEvent {
  bridge.getPanelColor(controllerId, x, y);
  return { controllerId, x, y, at: new Date() };
}

/**
 * Incoming hook: a panel on the controller was pressed. Emits `panelDown` on
 * {@link panelEvents}.
 *
 * @param controllerId - The ID of the controller that reported the press.
 * @param x - The column of the panel.
 * @param y - The row of the panel.
 * @throws {ServiceError} `NOT_FOUND` if the controller is not connected,
 * `BAD_REQUEST` if the panel is outside its grid.
 */
export function onPanelDown(controllerId: string, x: number, y: number) {
  panelEvents.emit("panelDown", toPanelEvent(controllerId, x, y));
}

/**
 * Incoming hook: a pressed panel on the controller was released. Emits
 * `panelUp` on {@link panelEvents}.
 *
 * @param controllerId - The ID of the controller that reported the release.
 * @param x - The column of the panel.
 * @param y - The row of the panel.
 * @throws {ServiceError} `NOT_FOUND` if the controller is not connected,
 * `BAD_REQUEST` if the panel is outside its grid.
 */
export function onPanelUp(controllerId: string, x: number, y: number) {
  panelEvents.emit("panelUp", toPanelEvent(controllerId, x, y));
}

/** Options for {@link setPanelColor}. */
export interface SetPanelColorOptions {
  /** Also store the color as game data of the running game. Default: false. */
  recordInGame?: boolean;
}

/**
 * Sets the color of a panel on the controller.
 *
 * @param controller - The controller the panel belongs to.
 * @param x - The column of the panel.
 * @param y - The row of the panel.
 * @param colorHex - The new color as `#RRGGBB` or `#RGB`. `null` or black turn the panel off.
 * @param options - Additional options, see {@link SetPanelColorOptions}.
 * @returns The stored color, or `null` if the panel is now off.
 * @throws {ServiceError} `CONFLICT` if `recordInGame` is set but no game is
 * running (the panel stays unchanged), `NOT_FOUND` if the controller is not
 * connected, `BAD_REQUEST` for an invalid color or a panel outside the grid.
 */
export async function setPanelColor(
  controller: Controller,
  x: number,
  y: number,
  colorHex: string | null,
  { recordInGame = false }: SetPanelColorOptions = {},
) {
  const runningGame = recordInGame
    ? await db.game.findFirst({
        where: { controllerId: controller.id, endedAt: null },
        select: { id: true },
      })
    : null;
  if (recordInGame && !runningGame) {
    throw new ServiceError("CONFLICT", "Controller has no running game");
  }

  const color = bridge.setPanelColor(controller.id, x, y, colorHex);

  if (runningGame) {
    await setPixel(runningGame.id, {
      x,
      y,
      colorHex: panelColorToHex(color),
    });
  }

  return color;
}
