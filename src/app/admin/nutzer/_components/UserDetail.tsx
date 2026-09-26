"use client";

import { Blobatar } from "@blobatar/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "wbl/app/_components/ui/button";
import { FormStatus } from "wbl/app/_components/ui/form-status";
import { Section } from "wbl/app/_components/ui/section";
import { DeleteButton } from "wbl/app/admin/_components/DeleteButton";
import { errorText, formatDateTime } from "wbl/app/admin/_components/format";
import {
  AdminHeader,
  AdminList,
  AdminRow,
  DetailList,
  Field,
  fieldClass,
} from "wbl/app/admin/_components/ui";
import { api, type RouterOutputs } from "wbl/trpc/react";

type User = RouterOutputs["admin"]["users"]["get"];

/**
 * Profile form, read-only auth data, play requests and delete action of a user.
 *
 * @param props - The user as loaded on the server.
 * @returns The page content.
 */
export function UserDetail({ initial }: { initial: User }) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: user } = api.admin.users.get.useQuery(
    { id: initial.id },
    { initialData: initial },
  );

  const update = api.admin.users.update.useMutation({
    onSuccess: () => utils.admin.invalidate(),
  });
  const remove = api.admin.users.delete.useMutation({
    onSuccess: async () => {
      router.push("/admin/nutzer");
      await utils.admin.users.list.invalidate();
    },
  });

  return (
    <>
      <AdminHeader
        title={user.name}
        description={<span className="font-mono">{user.id}</span>}
        back={{ href: "/admin/nutzer", label: "Nutzer" }}
        action={<Blobatar name={user.name} size={48} alt="" />}
      />
      <DetailList
        entries={[
          ["E-Mail bestätigt", user.emailVerified ? "ja" : "nein"],
          ["Registriert", formatDateTime(user.createdAt)],
          ["Geändert", formatDateTime(user.updatedAt)],
          [
            "Anmeldewege",
            user.accounts.map((account) => account.providerId).join(", ") ||
              "–",
          ],
        ]}
      />
      <UserForm
        key={user.updatedAt.getTime()}
        user={user}
        onSubmit={(values) => update.mutate({ id: user.id, ...values })}
        isPending={update.isPending}
        error={errorText(update.error)}
        success={update.isSuccess ? "Gespeichert." : null}
      />

      <Section
        title="Anfragen"
        icon="BubbleSearch"
        description="Selbst erstellt und beigetreten."
      >
        {user.playRequests.length + user.playParticipations.length === 0 ? (
          <p className="text-sm text-white/50">Keine Anfragen.</p>
        ) : (
          <AdminList>
            {user.playRequests.map((request) => (
              <AdminRow
                key={request.id}
                href={`/admin/anfragen/${request.id}`}
                title={`${request.gameType.name} · ${request.controller.name}`}
                subtitle={`Host · ${formatDateTime(request.startsAt)}`}
              />
            ))}
            {user.playParticipations.map(({ playRequest }) => (
              <AdminRow
                key={playRequest.id}
                href={`/admin/anfragen/${playRequest.id}`}
                title={`${playRequest.gameType.name} · ${playRequest.controller.name}`}
                subtitle={`Teilnehmer · ${formatDateTime(playRequest.startsAt)}`}
              />
            ))}
          </AdminList>
        )}
      </Section>

      <Section title="Sessions" icon="Laptop" description="Nur lesend.">
        {user.sessions.length === 0 ? (
          <p className="text-sm text-white/50">Keine Sessions.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.sessions.map((session) => (
              <li
                key={session.id}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <p className="truncate text-white/80">
                  {session.userAgent ?? "Unbekanntes Gerät"}
                </p>
                <p className="text-xs text-white/50">
                  {session.ipAddress ?? "keine IP"} · seit{" "}
                  {formatDateTime(session.createdAt)} · läuft ab{" "}
                  {formatDateTime(session.expiresAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Passkeys" icon="Fingerprint" description="Nur lesend.">
        {user.passkeys.length === 0 ? (
          <p className="text-sm text-white/50">Keine Passkeys.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.passkeys.map((passkey) => (
              <li
                key={passkey.id}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                {passkey.name ?? "Ohne Namen"}{" "}
                <span className="text-white/50">
                  · {passkey.deviceType} · {formatDateTime(passkey.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Löschen" icon="Trash" tone="magenta">
        <DeleteButton
          what="Nutzer"
          consequence="Sessions, Anmeldewege, Passkeys, eigene Anfragen und Teilnahmen werden mitgelöscht."
          onConfirm={() => remove.mutate({ id: user.id })}
          isPending={remove.isPending}
          error={errorText(remove.error)}
        />
      </Section>
    </>
  );
}

function UserForm({
  user,
  onSubmit,
  isPending,
  error,
  success,
}: {
  user: User;
  onSubmit: (values: { name: string; email: string }) => void;
  isPending: boolean;
  error: string | null;
  success: string | null;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ name, email });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Field label="Name">
        <input
          required
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="E-Mail">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
