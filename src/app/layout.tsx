import "wbl/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist, Silkscreen } from "next/font/google";

import { BottomBar } from "wbl/app/_components/BottomBar";
import { Header } from "wbl/app/_components/Header";
import { getSession } from "wbl/server/better-auth/server";

import { TRPCReactProvider } from "wbl/trpc/react";

export const metadata: Metadata = {
  title: { default: "Blinkin Lights Münster", template: "%s | Blinkin Lights" },
  description:
    "Leuchtende Spielfelder mitten in Münster: einfach draufstellen und losspielen.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <html lang="de" className={`${geist.variable} ${silkscreen.variable}`}>
      <body className="bg-surface min-h-dvh pb-(--bottombar-h) text-white">
        <Header initialUserName={session?.user.name} />
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <BottomBar />
      </body>
    </html>
  );
}
