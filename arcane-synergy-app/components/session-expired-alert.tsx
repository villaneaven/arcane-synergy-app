"use client";

import { useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";

export function SessionExpiredAlert() {
  const { data: session } = useSession();
  const hasAlerted = useRef(false);

  useEffect(() => {
    if (session?.error !== "RefreshAccessTokenError" || hasAlerted.current) {
      return;
    }

    hasAlerted.current = true;

    toast.error("Your session has expired. Please log in again.", {
      position: "top-center",
      duration: Infinity,
      action: {
        label: "Log in",
        onClick: () => signIn("azure-ad"),
      },
    });
  }, [session]);

  return null;
}
