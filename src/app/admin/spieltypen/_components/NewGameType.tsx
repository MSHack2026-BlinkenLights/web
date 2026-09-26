"use client";

import { useRouter } from "next/navigation";

import { errorText } from "wbl/app/admin/_components/format";
import { AdminHeader } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";
import { GameTypeForm } from "./GameTypeForm";

/** Page content to create a game type; opens it afterwards. */
export function NewGameType() {
  const router = useRouter();
  const utils = api.useUtils();
  const create = api.admin.gameTypes.create.useMutation({
    onSuccess: async (created) => {
      await utils.admin.invalidate();
      if (created) router.push(`/admin/spieltypen/${created.id}`);
    },
  });

  return (
    <>
      <AdminHeader
        title="Neuer Spieltyp"
        back={{ href: "/admin/spieltypen", label: "Spieltypen" }}
      />
      <GameTypeForm
        onSubmit={(values) => create.mutate(values)}
        isPending={create.isPending}
        error={errorText(create.error)}
        submitLabel="Anlegen"
      />
    </>
  );
}
