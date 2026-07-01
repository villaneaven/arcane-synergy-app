"use client";

import { DashboardChart } from "@/components/dashboard-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { Eye, TrendingUpDown, Users } from "lucide-react";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen w-full bg-background font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col gap-8 bg-white dark:bg-black">
        <header className="relative flex w-full items-start bg-accent px-4 py-4 pl-14 dark:bg-accent-dark sm:px-8 sm:pl-16">
          <SidebarTrigger className="absolute left-0 top-0" />
          <div className="flex flex-col items-start gap-4 w-full py-4">
            <h1 className="text-4xl font-bold text-black dark:text-white">
              Welcome back, {session?.user?.name || "User"}!
            </h1>
            <Separator className="w-full" />
            <div className="flex w-full flex-wrap items-center gap-4">
              <Field className="w-full max-w-48">
                <FieldLabel>Group</FieldLabel>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Groups</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-full max-w-48">
                <FieldLabel>Insurance</FieldLabel>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Insurance</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-full max-w-48">
                <FieldLabel>Clinic</FieldLabel>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Clinics</SelectItem>
                      <SelectItem value="EMC">EMC</SelectItem>
                      <SelectItem value="VFC">VFC</SelectItem>
                      <SelectItem value="RGVAIMS-WES">RGVAIMS-WES</SelectItem>
                      <SelectItem value="DMC">DMC</SelectItem>
                      <SelectItem value="RGVAIMS-MER">RGVAIMS-MER</SelectItem>
                      <SelectItem value="MVFPA">MVFPA</SelectItem>
                      <SelectItem value="MCACC">MCACC</SelectItem>
                      <SelectItem value="WMC">WMC</SelectItem>
                      <SelectItem value="KCP-HAR">KCP-HAR</SelectItem>
                      <SelectItem value="MMC">MMC</SelectItem>
                      <SelectItem value="DDNC">DDNC</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-full max-w-48">
                <FieldLabel>Type of Admission</FieldLabel>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Admission Types</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-full max-w-48">
                <FieldLabel>Date Range</FieldLabel>
                <Select defaultValue="180">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="365">Last 365 Days</SelectItem>
                      <SelectItem value="180">Last 180 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full flex-row items-center start-center gap-8 px-8">
          <Card className="w-full max-w-3xs">
            <CardHeader className="flex items-center gap-2">
              <Users />
              <CardTitle>Count of Admissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p>6,909</p>
            </CardContent>
          </Card>
          <Card className="w-full max-w-3xs">
            <CardHeader className="flex items-center gap-2">
              <Eye />
              <CardTitle>Patients Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p>6,909</p>
            </CardContent>
          </Card>
        </div>
        <div className="mx-auto flex w-full flex-col gap-8 px-8">
          <Card className="mx-auto flex w-full flex-col gap-8 p-8 sm:px-8">
            <CardHeader className="flex items-center gap-2">
              <TrendingUpDown />
              <CardTitle>Admissions Trend</CardTitle>
            </CardHeader>
            <CardContent className="w-full">
              <DashboardChart />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
