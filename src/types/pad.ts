import { z } from "zod";

/** A LED color as 6-digit hex (`#RRGGBB`), or `null` for a pixel that is off. */
export const pixelColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullable();

export type PixelColor = z.infer<typeof pixelColorSchema>;

/**
 * Current state of a pad's LED grid.
 * `pixels` is row-major: index = y * width + x, length = width * height.
 */
export const padGridStateSchema = z
  .object({
    padId: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    pixels: z.array(pixelColorSchema),
    updatedAt: z.coerce.date(),
  })
  .refine((state) => state.pixels.length === state.width * state.height, {
    message: "pixels.length must equal width * height",
    path: ["pixels"],
  });

export type PadGridState = z.infer<typeof padGridStateSchema>;

export const padLogLevelSchema = z.enum(["info", "warn", "error"]);

export type PadLogLevel = z.infer<typeof padLogLevelSchema>;

/** A single incoming log line from a pad (sensor events, connection status, …). */
export const padLogEntrySchema = z.object({
  id: z.string(),
  padId: z.string(),
  timestamp: z.coerce.date(),
  level: padLogLevelSchema,
  message: z.string(),
});

export type PadLogEntry = z.infer<typeof padLogEntrySchema>;
