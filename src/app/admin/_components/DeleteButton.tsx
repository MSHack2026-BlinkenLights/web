"use client";

import { useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";

/**
 * Delete button that asks for confirmation inline before calling `onConfirm`.
 *
 * @param props - What gets deleted, the delete action, its pending state and error.
 * @returns The button, or the confirmation row.
 */
export function DeleteButton({
  what,
  consequence,
  onConfirm,
  isPending,
  error,
}: {
  what: string;
  consequence?: string;
  onConfirm: () => void;
  isPending: boolean;
  error?: string | null;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          tone="magenta"
          icon="Trash"
          onClick={() => setConfirming(true)}
          className="w-fit"
        >
          {what} löschen
        </Button>
        <FormStatus error={error} />
      </div>
    );
  }

  return (
    <div className="border-neon-magenta/40 flex flex-col gap-3 rounded-2xl border p-4">
      <p className="text-sm text-white/80">
        {what} wirklich löschen? {consequence}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button tone="magenta" isPending={isPending} onClick={onConfirm}>
          Endgültig löschen
        </Button>
        <Button
          variant="ghost"
          tone="neutral"
          onClick={() => setConfirming(false)}
        >
          Abbrechen
        </Button>
      </div>
      <FormStatus error={error} />
    </div>
  );
}
