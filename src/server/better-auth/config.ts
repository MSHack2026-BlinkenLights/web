import { getAuthenticatorName, passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { db } from "wbl/server/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql", // or "sqlite" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Must be last: lets server actions set auth cookies.
  plugins: [
    passkey({
      rpName: "Blinkin Lights",
      registration: {
        // Label unnamed passkeys after their provider, e.g. "1Password".
        afterVerification: async ({ verification }) => ({
          name: getAuthenticatorName(verification.registrationInfo?.aaguid),
        }),
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
