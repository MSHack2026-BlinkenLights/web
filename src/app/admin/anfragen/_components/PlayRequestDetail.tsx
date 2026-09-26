"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Blobatar } from "@blobatar/react";
import { DynamicIcon } from "wbl/app/_components/DynamicIcon";
import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Section } from "wbl/app/_components/ui/section";
import { DeleteButton } from "wbl/app/admin/_components/DeleteButton";
import {
  errorText,
  formatDateTime,
  parseLocalDateTime,
} from "wbl/app/admin/_components/format";
import { AdminHeader, Field, fieldClass } from "wbl/app/admin/_components/ui";
import { api, type RouterOutputs } from "wbl/trpc/react";
import { toLocalInputValue } from "wbl/utils/time";

type PlayRequest = RouterOutputs["admin"]["playRequests"]["get"];

/**
 * Edit form, participants and delete action of a play request.
 *
 * @param props - The play request as loaded on the server.
 * @returns The page content.
 */
export function PlayRequestDetail({ initial }: { initial: PlayRequest }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: request } = api.admin.playRequests.get.useQuery(
    { id: initial.id },
    { initialData: initial },
  );

  const update = api.admin.playRequests.update.useMutation({
    onSuccess: () => utils.admin.invalidate(),
  });
  const remove = api.admin.playRequests.delete.useMutation({
    onSuccess: async () => {
      router.push("/admin/anfragen");
      await utils.admin.playRequests.list.invalidate();
    },
  });

  return (
    <>
      <AdminHeader
        title="Anfrage"
        description={
          <>
            von{" "}
            <Link
              href={`/admin/nutzer/${request.host.id}`}
              className="hover:text-neon-cyan underline"
            >
              {request.host.name}
            </Link>{" "}
            · erstellt {formatDateTime(request.createdAt)} ·{" "}
            <span className="font-mono">{request.id}</span>
          </>
        }
        back={{ href: "/admin/anfragen", label: "Anfragen" }}
      />
      <PlayRequestForm
        key={request.updatedAt.getTime()}
        request={request}
        onSubmit={(data) => update.mutate({ id: request.id, data })}
        isPending={update.isPending}
        error={errorText(update.error)}
        success={update.isSuccess ? "Gespeichert." : null}
      />
      <Participants request={request} />
      <Section title="Löschen" icon="Trash" tone="magenta">
        <DeleteButton
          what="Anfrage"
          consequence="Alle Teilnahmen werden mitgelöscht."
          onConfirm={() => remove.mutate({ id: request.id })}
          isPending={remove.isPending}
          error={errorText(remove.error)}
        />
      </Section>
    </>
  );
}

function PlayRequestForm({
  request,
  onSubmit,
  isPending,
  error,
  success,
}: {
  request: PlayRequest;
  onSubmit: (data: {
    controllerId: string;
    gameTypeId: string;
    startsAt: Date;
    endsAt: Date;
    openSlots: number;
    note: string | null;
  }) => void;
  isPending: boolean;
  error: string | null;
  success: string | null;
}) {
  const [options] = api.admin.options.useSuspenseQuery();
  const [controllerId, setControllerId] = useState(request.controllerId);
  const [gameTypeId, setGameTypeId] = useState(request.gameTypeId);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(request.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(request.endsAt));
  const [openSlots, setOpenSlots] = useState(String(request.openSlots));
  const [note, setNote] = useState(request.note ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const start = parseLocalDateTime(startsAt);
    const end = parseLocalDateTime(endsAt);
    if (!start || !end) return;
    onSubmit({
      controllerId,
      gameTypeId,
      startsAt: start,
      endsAt: end,
      openSlots: Number(openSlots),
      note: note || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Field label="Controller">
        <select
          value={controllerId}
          onChange={(event) => setControllerId(event.target.value)}
          className={fieldClass}
        >
          {options.controllers.map((controller) => (
            <option key={controller.id} value={controller.id}>
              #{controller.hardwareId} · {controller.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Spieltyp">
        <select
          value={gameTypeId}
          onChange={(event) => setGameTypeId(event.target.value)}
          className={fieldClass}
        >
          {options.gameTypes.map((gameType) => (
            <option key={gameType.id} value={gameType.id}>
              {gameType.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Start">
        <input
          type="datetime-local"
          required
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Ende">
        <input
          type="datetime-local"
          required
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Freie Plätze" hint="Ohne den Host">
        <input
          type="number"
          required
          min={1}
          value={openSlots}
          onChange={(event) => setOpenSlots(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Notiz">
        <input
          value={note}
          maxLength={200}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <div className="flex flex-col gap-2 md:col-span-2">
        <Button type="submit" isPending={isPending} className="w-fit">
          Speichern
        </Button>
        <FormStatus error={error} success={success} />
      </div>
    </form>
  );
}

function Participants({ request }: { request: PlayRequest }) {
  const utils = api.useUtils();
  const users = api.admin.users.options.useQuery();
  const [userId, setUserId] = useState("");
  const refresh = () => utils.admin.invalidate();

  const add = api.admin.playRequests.addParticipant.useMutation({
    onSuccess: async () => {
      setUserId("");
      await refresh();
    },
  });
  const remove = api.admin.playRequests.removeParticipant.useMutation({
    onSettled: refresh,
  });

  const taken = new Set([
    request.host.id,
    ...request.participants.map((p) => p.user.id),
  ]);
  const candidates = users.data?.filter((user) => !taken.has(user.id)) ?? [];

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    if (userId) add.mutate({ id: request.id, userId });
  };

  return (
    <Section
      title="Teilnehmer"
      icon="Group"
      description={`${request.participants.length} von ${request.openSlots} freien Plätzen belegt (ohne Host). Admins dürfen überbuchen.`}
    >
      {request.participants.length === 0 ? (
        <p className="text-sm text-white/50">Noch niemand dabei.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {request.participants.map(({ user, joinedAt }) => (
            <li
              key={user.id}
              className="flex min-h-12 items-center gap-3 rounded-full bg-white/10 pr-1 pl-2"
            >
              <Blobatar name={user.name} size={28} alt="" />
              <Link
                href={`/admin/nutzer/${user.id}`}
                className="hover:text-neon-cyan min-w-0 flex-1 truncate text-sm"
              >
                {user.name}{" "}
                <span className="text-white/50">· {user.email}</span>
              </Link>
              <span className="hidden text-xs text-white/40 md:inline">
                {formatDateTime(joinedAt)}
              </span>
              <button
                type="button"
                onClick={() =>
                  remove.mutate({ id: request.id, userId: user.id })
                }
                aria-label={`${user.name} entfernen`}
                className="hover:text-neon-magenta flex size-10 items-center justify-center rounded-full text-white/60"
              >
                <DynamicIcon name="Trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-2 md:flex-row md:items-end"
      >
        <Field label="Nutzer hinzufügen" className="flex-1">
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className={fieldClass}
          >
            <option value="">Nutzer wählen</option>
            {candidates.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </Field>
        <Button
          type="submit"
          variant="outline"
          icon="Plus"
          isPending={add.isPending}
          disabled={!userId}
        >
          Hinzufügen
        </Button>
      </form>
      <FormStatus error={errorText(add.error ?? remove.error)} />
    </Section>
  );
}
