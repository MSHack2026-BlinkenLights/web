import { db } from "wbl/server/db";
import {
  sanitizeColorHex,
  sanitizeId,
  ServiceError,
} from "wbl/server/services/common";

/** Color of a panel: `"#RRGGBB"` when lit, `null` when off. */
export type PanelColor = string | null;

const OFF_COLOR_HEX = "#000000";

/**
 * Normalizes a color input to a {@link PanelColor}.
 *
 * @param colorHex - The color as `#RRGGBB` or `#RGB`, with or without `#`. `null` means off.
 * @returns The color as uppercase `"#RRGGBB"`, or `null` for `null` and black.
 * @throws {ServiceError} `BAD_REQUEST` if the color is not valid hex.
 */
export function normalizePanelColor(colorHex: string | null): PanelColor {
  if (colorHex === null) return null;
  const color = sanitizeColorHex(colorHex);
  return color === OFF_COLOR_HEX ? null : color;
}

/**
 * Converts a {@link PanelColor} for storage where a color is required, such as game data.
 *
 * @param color - The color of the panel.
 * @returns The color itself, or `"#000000"` if the panel is off.
 */
export function panelColorToHex(color: PanelColor): string {
  return color ?? OFF_COLOR_HEX;
}

interface ControllerEntry {
  online: boolean;
  width: number;
  height: number;
  panels: PanelColor[][];
}

/**
 * In-memory stand-in for the real hardware bridge. Keeps the online status
 * and the current panel colors of every registered controller.
 * Prototype only: all state is lost on restart.
 */
export class DummyBridge {
  private readonly controllers = new Map<string, ControllerEntry>();

  /**
   * Registers a controller and marks it online. Panels start out off.
   * Re-registering keeps the colors unless the controller's dimensions changed.
   *
   * @param rawId - The ID of a controller that exists in the database.
   * @throws {ServiceError} `BAD_REQUEST` if the ID is not a UUID, `NOT_FOUND`
   * if the controller does not exist.
   */
  async connect(rawId: string) {
    const id = sanitizeId(rawId, "controllerId");
    const controller = await db.controller.findUnique({
      where: { id },
      select: { width: true, height: true },
    });
    if (!controller) {
      throw new ServiceError("NOT_FOUND", "Controller not found");
    }

    const existing = this.controllers.get(id);
    if (
      existing?.width === controller.width &&
      existing.height === controller.height
    ) {
      existing.online = true;
      return;
    }
    this.controllers.set(id, {
      online: true,
      width: controller.width,
      height: controller.height,
      panels: Array.from({ length: controller.height }, () =>
        Array<PanelColor>(controller.width).fill(null),
      ),
    });
  }

  /**
   * Marks a controller offline. Its panel colors are kept.
   *
   * @param id - The ID of the controller.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected.
   */
  disconnect(id: string) {
    this.get(id).online = false;
  }

  /**
   * Sets the online status of a controller.
   *
   * @param id - The ID of the controller.
   * @param online - The new online status.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected.
   */
  setOnline(id: string, online: boolean) {
    this.get(id).online = online;
  }

  /**
   * Whether a controller is online.
   *
   * @param id - The ID of the controller.
   * @returns `false` if the controller is offline or has never connected.
   */
  isOnline(id: string) {
    return this.controllers.get(id)?.online ?? false;
  }

  /**
   * Grid size of a controller, as loaded when it connected.
   *
   * @param id - The ID of the controller.
   * @returns The width and height of the grid in panels.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected.
   */
  getDimensions(id: string) {
    const { width, height } = this.get(id);
    return { width, height };
  }

  /**
   * Current color of a panel.
   *
   * @param id - The ID of the controller.
   * @param x - The column of the panel.
   * @param y - The row of the panel.
   * @returns The color as `"#RRGGBB"`, or `null` if the panel is off.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected,
   * `BAD_REQUEST` if the panel is outside the grid.
   */
  getPanelColor(id: string, x: number, y: number): PanelColor {
    const entry = this.get(id);
    this.assertInBounds(entry, x, y);
    return entry.panels[y]![x] ?? null;
  }

  /**
   * Whether a panel is lit.
   *
   * @param id - The ID of the controller.
   * @param x - The column of the panel.
   * @param y - The row of the panel.
   * @returns `false` if the panel is off.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected,
   * `BAD_REQUEST` if the panel is outside the grid.
   */
  isPanelOn(id: string, x: number, y: number) {
    return this.getPanelColor(id, x, y) !== null;
  }

  /**
   * Copy of all panel colors.
   *
   * @param id - The ID of the controller.
   * @returns The colors indexed `[y][x]`. `null` means off.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected.
   */
  getPanels(id: string) {
    return this.get(id).panels.map((row) => [...row]);
  }

  /**
   * Sets the color of a panel.
   *
   * @param id - The ID of the controller.
   * @param x - The column of the panel.
   * @param y - The row of the panel.
   * @param colorHex - The new color as `#RRGGBB` or `#RGB`. `null` or black turn the panel off.
   * @returns The stored color, or `null` if the panel is now off.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected,
   * `BAD_REQUEST` for an invalid color or a panel outside the grid.
   */
  setPanelColor(id: string, x: number, y: number, colorHex: string | null) {
    const entry = this.get(id);
    this.assertInBounds(entry, x, y);
    const color = normalizePanelColor(colorHex);
    entry.panels[y]![x] = color;
    return color;
  }

  /**
   * Sets every panel of a controller to the same color.
   *
   * @param id - The ID of the controller.
   * @param colorHex - The new color as `#RRGGBB` or `#RGB`. `null` (default) or black turn all panels off.
   * @throws {ServiceError} `NOT_FOUND` if the controller was never connected,
   * `BAD_REQUEST` for an invalid color.
   */
  fill(id: string, colorHex: string | null = null) {
    const entry = this.get(id);
    const color = normalizePanelColor(colorHex);
    for (const row of entry.panels) row.fill(color);
  }

  private get(id: string) {
    const entry = this.controllers.get(id);
    if (!entry) {
      throw new ServiceError(
        "NOT_FOUND",
        `Controller ${id} is not connected to the bridge`,
      );
    }
    return entry;
  }

  private assertInBounds(entry: ControllerEntry, x: number, y: number) {
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x >= entry.width ||
      y >= entry.height
    ) {
      throw new ServiceError(
        "BAD_REQUEST",
        `Panel (${x}, ${y}) outside ${entry.width}x${entry.height} grid`,
      );
    }
  }
}

// Kept on globalThis: server.js loads modules unbundled while Next bundles the
// API routes, so a plain module export would create two separate bridges.
const globalForBridge = globalThis as unknown as { bridge?: DummyBridge };
/** Shared {@link DummyBridge} instance for the whole backend. */
export const bridge = (globalForBridge.bridge ??= new DummyBridge());
