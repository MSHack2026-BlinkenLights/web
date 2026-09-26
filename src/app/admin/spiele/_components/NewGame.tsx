"use client";

import { useRouter } from "next/navigation";

import { errorText } from "wbl/app/admin/_components/format";
import { AdminHeader } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";
import { GameForm } from "./GameForm";

/** Page content to create a game; opens it afterwards. */
export function NewGame() {
  const router = useRouter();
  const utils = api.useUtils();
  const create = api.admin.games.create.useMutation({
    onSuccess: async (created) => {
      await utils.admin.invalidate();
      if (created) router.push(`/admin/spiele/${created.id}`);
    },
  });

  return (
    <>
      <AdminHeader
        title="Neues Spiel"
        back={{ href: "/admin/spiele", label: "Spiele" }}
      />
      <GameForm
        onSubmit={(values) => create.mutate(values)}
        isPending={create.isPending}
        error={errorText(create.error)}
        submitLabel="Anlegen"
      />
    </>
  );
}
