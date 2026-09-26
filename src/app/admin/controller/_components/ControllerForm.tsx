"use client";

import { type FormEvent, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { parseOptionalNumber } from "wbl/app/admin/_components/format";
import { Field, fieldClass } from "wbl/app/admin/_components/ui";
import { type RouterInputs } from "wbl/trpc/react";

export type ControllerValues = RouterInputs["admin"]["controllers"]["create"];

/**
 * Form for the admin-editable fields of a controller, used to create and to
 * edit. The grid size is not editable: the hardware reports it on `hello`.
 *
 * @param props - Initial values, submit handler, pending state, error, success message and button label.
 * @returns The form.
 */
export function ControllerForm({
  initial,
  onSubmit,
  isPending,
  error,
  success,
  submitLabel,
}: {
  initial?: ControllerValues;
  onSubmit: (values: ControllerValues) => void;
  isPending: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel: string;
}) {
  const [hardwareId, setHardwareId] = useState(
    String(initial?.hardwareId ?? ""),
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [latitude, setLatitude] = useState(String(initial?.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(initial?.longitude ?? ""));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      hardwareId: Number(hardwareId),
      name,
      location,
      latitude: parseOptionalNumber(latitude),
      longitude: parseOptionalNumber(longitude),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Field
        label="Hardware-ID"
        hint="Ganzzahl, mit der sich die Hardware meldet"
      >
        <input
          type="number"
          required
          min={0}
          step={1}
          value={hardwareId}
          onChange={(event) => setHardwareId(event.target.value)}
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
      <Field label="Standort" className="md:col-span-2">
        <input
          required
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={200}
          className={fieldClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
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
