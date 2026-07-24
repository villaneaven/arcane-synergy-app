"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PatientSearchInput } from "../patient-search-input";

export function SearchHome() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="w-full bg-background font-sans dark:bg-black">
      <main className="flex w-full flex-col gap-8 bg-white dark:bg-black pb-8">
        <header className="relative flex w-full items-start bg-accent px-4 py-4 pl-14 dark:bg-accent-dark sm:px-8 sm:pl-16">
          <SidebarTrigger className="absolute left-0 top-0" />
          <div className="flex flex-col items-start gap-4 w-full py-4">
            <h1 className="text-4xl font-bold text-black dark:text-white">
              Welcome back, {session?.user?.name || "User"}!
            </h1>
            <Separator className="w-full" />
          </div>
        </header>
        <div className="flex items-center justify-center w-full px-20">
          <PatientSearchInput
            onChange={(patientID) =>
              router.push(`/forms/patients/${patientID}`)
            }
          />
        </div>
      </main>
    </div>
  );
}
