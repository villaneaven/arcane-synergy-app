"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ClipboardCheck, Stethoscope, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const QUICK_LINKS = [
  {
    href: "/forms/patients",
    label: "Patients",
    description: "View and manage patient records",
    icon: Users,
  },
  {
    href: "/forms/admissions",
    label: "Admissions",
    description: "View and manage admissions",
    icon: Stethoscope,
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Review reports",
    icon: ClipboardCheck,
  },
];

export function WelcomeHome() {
  const { data: session } = useSession();

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
        <div className="mx-auto grid w-full grid-cols-1 gap-8 px-8 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="h-full transition-colors hover:bg-accent dark:hover:bg-accent-dark">
                <CardHeader className="flex items-center gap-2">
                  <Icon />
                  <CardTitle>{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
