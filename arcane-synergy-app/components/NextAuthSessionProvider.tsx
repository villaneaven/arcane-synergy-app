"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface Props {
  children: React.ReactNode;
  session?: Session | null;
}

const SESSION_REFETCH_INTERVAL_SECONDS = 5 * 60;

export default function NextAuthSessionProvider({ children, session }: Props) {
  return (
    <SessionProvider
      session={session}
      refetchInterval={SESSION_REFETCH_INTERVAL_SECONDS}
    >
      {children}
    </SessionProvider>
  );
}
