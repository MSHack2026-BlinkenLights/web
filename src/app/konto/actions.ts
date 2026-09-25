"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";

import { auth } from "wbl/server/better-auth";
import { db } from "wbl/server/db";

/**
 * Changes the signed-in user's email after re-checking their password.
 *
 * @param input - The new email address and the user's current password.
 * @returns An object with a German error message if the change failed.
 */
export async function changeEmail({
  newEmail,
  password,
}: {
  newEmail: string;
  password: string;
}): Promise<{ error?: string }> {
  const requestHeaders = await headers();

  try {
    await auth.api.verifyPassword({
      body: { password },
      headers: requestHeaders,
    });
  } catch (error) {
    if (isAPIError(error)) return { error: "Das Passwort stimmt nicht." };
    throw error;
  }

  // Better Auth reports success for taken addresses without changing anything.
  const taken = await db.user.findUnique({
    where: { email: newEmail.toLowerCase() },
    select: { id: true },
  });
  if (taken) return { error: "Diese E-Mail wird schon verwendet." };

  try {
    await auth.api.changeEmail({
      body: { newEmail },
      headers: requestHeaders,
    });
  } catch (error) {
    if (isAPIError(error)) {
      return { error: "E-Mail konnte nicht geändert werden." };
    }
    throw error;
  }

  return {};
}
