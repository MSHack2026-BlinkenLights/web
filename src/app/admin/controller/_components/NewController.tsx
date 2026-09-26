"use client";

import { useRouter } from "next/navigation";

import { errorText } from "wbl/app/admin/_components/format";
import { AdminHeader } from "wbl/app/admin/_components/ui";
import { api } from "wbl/trpc/react";
import { ControllerForm } from "./ControllerForm";

/** Page content to create a controller; opens it afterwards. */
export function NewController() {
  const router = useRouter();
  const utils = api.useUtils();
  const create = api.admin.controllers.create.useMutation({
    onSuccess: async (created) => {
      await utils.admin.invalidate();
      if (created) router.push(`/admin/controller/${created.id}`);
    },
  });

  return (
    <>
      <AdminHeader
        title="Neuer Controller"
        back={{ href: "/admin/controller", label: "Controller" }}
      />
      <ControllerForm
        onSubmit={(values) => create.mutate(values)}
        isPending={create.isPending}
        error={errorText(create.error)}
        submitLabel="Anlegen"
      />
    </>
  );
}
