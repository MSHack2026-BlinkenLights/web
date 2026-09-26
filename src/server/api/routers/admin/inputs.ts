import { z } from "zod";

export const idInput = z.object({ id: z.string().uuid() });

/** User IDs come from better-auth and are not UUIDs. */
export const userIdInput = z.object({ id: z.string().min(1) });

export const optionalCoordinate = z.number().nullable().optional();
