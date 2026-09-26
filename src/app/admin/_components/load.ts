import "server-only";

import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

/**
 * Loads a row for a detail page and shows the 404 page if it is missing or the ID is malformed.
 *
 * @param load - The server-side tRPC call.
 * @returns The row.
 */
export async function loadOrNotFound<T>(load: () => Promise<T>) {
  try {
    return await load();
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      notFound();
    }
    throw error;
  }
}
