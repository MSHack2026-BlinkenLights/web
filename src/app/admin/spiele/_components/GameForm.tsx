"use client";

import { type FormEvent, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import {
  parseLocalDateTime,
  parseOptionalNumber,
} from "wbl/app/admin/_components/format";
import { Field, fieldClass } from "wbl/app/admin/_components/ui";
import { api, type RouterInputs } from "wbl/trpc/react";
import { toLocalInputValue } from "wbl/utils/time";

export type GameValues = RouterInputs["admin"]["games"]["create"];

/**
 * Form for all fields of a game, used to create and to edit. Admins may set
 * any times; only the end must not lie before the start.
 *
 * @param props - Initial values, submit handler, pending state, error, success message and button label.
 * @returns The form.
 */
export function GameForm({
  initial,
  onSubmit,
  isPending,
  error,
  success,
  submitLabel,
}: {
  initial?: Partial<GameValues>;
  onSubmit: (values: GameValues) => void;
  isPending: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel: string;
}) {
  const [options] = api.admin.options.useSuspenseQuery();
  const [controllerId, setControllerId] = useState(initial?.controllerId ?? "");
  const [gameTypeId, setGameTypeId] = useState(initial?.gameTypeId ?? "");
  const [startedAt, setStartedAt] = useState(
    toLocalInputValue(initial?.startedAt ?? new Date()),
  );
  const [endedAt, setEndedAt] = useState(
    initial?.endedAt ? toLocalInputValue(initial.endedAt) : "",
  );
  const [latitude, setLatitude] = useState(String(initial?.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(initial?.longitude ?? ""));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      controllerId,
      gameTypeId,
      startedAt: parseLocalDateTime(startedAt) ?? new Date(),
      endedAt: parseLocalDateTime(endedAt),
      latitude: parseOptionalNumber(latitude),
      longitude: parseOptionalNumber(longitude),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Field label="Controller">
        <select
          required
          value={controllerId}
          onChange={(event) => setControllerId(event.target.value)}
          className={fieldClass}
        >
          <option value="" disabled>
            Controller wählen
          </option>
          {options.controllers.map((controller) => (
            <option key={controller.id} value={controller.id}>
              #{controller.hardwareId} · {controller.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Spieltyp">
        <select
          required
          value={gameTypeId}
          onChange={(event) => setGameTypeId(event.target.value)}
          className={fieldClass}
        >
          <option value="" disabled>
            Spieltyp wählen
          </option>
          {options.gameTypes.map((gameType) => (
            <option key={gameType.id} value={gameType.id}>
              {gameType.name} ({gameType.key})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Start">
        <input
          type="datetime-local"
          required
          value={startedAt}
          onChange={(event) => setStartedAt(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Ende" hint="Leer lassen, wenn das Spiel noch läuft">
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={endedAt}
            onChange={(event) => setEndedAt(event.target.value)}
            className={fieldClass}
          />
          <Button
            variant="outline"
            tone="neutral"
            className="shrink-0 !px-4"
            onClick={() => setEndedAt(toLocalInputValue(new Date()))}
          >
            Jetzt
          </Button>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4 md:col-span-2">
        <Field label="Breitengrad">
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Längengrad">
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Button type="submit" isPending={isPending} className="w-fit">
          {submitLabel}
        </Button>
        <FormStatus error={error} success={success} />
      </div>
    </form>
  );
}
