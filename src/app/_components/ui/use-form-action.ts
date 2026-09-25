"use client";

import { useState } from "react";

import { type FormResult } from "wbl/app/_components/ui/form-status";

/**
 * Tracks the pending state and outcome of async form actions.
 *
 * @returns The current `status`, whether an action `isPending`, and `run` to start one.
 */
export function useFormAction() {
  const [status, setStatus] = useState<FormResult>({});
  const [isPending, setIsPending] = useState(false);

  /**
   * Runs an action and stores the result it returns.
   *
   * @param action - The action to run; resolves to its error or success message.
   * @returns The action's result.
   */
  const run = async (action: () => Promise<FormResult | void>) => {
    setStatus({});
    setIsPending(true);
    try {
      const result = (await action()) ?? {};
      setStatus(result);
      return result;
    } finally {
      setIsPending(false);
    }
  };

  return { status, isPending, run };
}
