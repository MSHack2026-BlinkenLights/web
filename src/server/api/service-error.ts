import { TRPCError } from "@trpc/server";

import { ServiceError } from "wbl/server/services";

/**
 * Runs a service call and turns its errors into tRPC errors with the same code.
 *
 * @param action - The service call.
 * @returns The call's result.
 * @throws {TRPCError} For every {@link ServiceError}; other errors are rethrown unchanged.
 */
export async function runService<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new TRPCError({ code: error.code, message: error.message });
    }
    throw error;
  }
}
