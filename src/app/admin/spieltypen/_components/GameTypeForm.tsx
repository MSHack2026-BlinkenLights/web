"use client";

import { type FormEvent, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Field, fieldClass } from "wbl/app/admin/_components/ui";
import { type RouterInputs } from "wbl/trpc/react";

export type GameTypeValues = RouterInputs["admin"]["gameTypes"]["create"];

/**
 * Form for all fields of a game type, used to create and to edit. The key
 * is read-only once the game type exists.
 *
 * @param props - Initial values, submit handler, pending state, error, success message and button label.
 * @returns The form.
 */
export function GameTypeForm({
  initial,
  onSubmit,
  isPending,
  error,
  success,
  submitLabel,
}: {
  initial?: GameTypeValues;
  onSubmit: (values: GameTypeValues) => void;
  isPending: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel: string;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [requiredWidth, setRequiredWidth] = useState(
    String(initial?.requiredWidth ?? 3),
  );
  const [requiredHeight, setRequiredHeight] = useState(
    String(initial?.requiredHeight ?? 3),
  );
  const [minPlayers, setMinPlayers] = useState(
    String(initial?.minPlayers ?? 1),
  );
  const [maxPlayers, setMaxPlayers] = useState(
    String(initial?.maxPlayers ?? 2),
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      key,
      name,
      description: description || null,
      requiredWidth: Number(requiredWidth),
      requiredHeight: Number(requiredHeight),
      minPlayers: Number(minPlayers),
      maxPlayers: Number(maxPlayers),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Field
        label="Key"
        hint={
          initial
            ? "Nicht änderbar, die Controller starten Spiele über den Key"
            : "Englisch, klein, mit Bindestrichen, z.B. tic-tac-toe; später nicht änderbar"
        }
      >
        <input
          required
          readOnly={!!initial}
          value={key}
          onChange={(event) => setKey(event.target.value)}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxLength={50}
          className={`${fieldClass} font-mono`}
        />
      </Field>
      <Field label="Name">
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          className={fieldClass}
        />
      </Field>
      <Field label="Beschreibung" className="md:col-span-2">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className={`${fieldClass} py-3`}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Breite (min.)">
          <input
            type="number"
            required
            min={1}
            value={requiredWidth}
            onChange={(event) => setRequiredWidth(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Höhe (min.)">
          <input
            type="number"
            required
            min={1}
            value={requiredHeight}
            onChange={(event) => setRequiredHeight(event.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Spieler min.">
          <input
            type="number"
            required
            min={1}
            value={minPlayers}
            onChange={(event) => setMinPlayers(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Spieler max.">
          <input
            type="number"
            required
            min={1}
            value={maxPlayers}
            onChange={(event) => setMaxPlayers(event.target.value)}
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
