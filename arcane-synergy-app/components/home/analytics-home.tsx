"use client";

import { useState, useMemo } from "react";
import { DashboardChart } from "@/components/dashboard-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { useAdmissionsCount } from "@/hooks/use-admissions-count";
import { usePendingPatientsCount } from "@/hooks/use-pending-patients-count";
import { useSession } from "next-auth/react";
import { Eye, TrendingUpDown, Users } from "lucide-react";
import { TYPE_OPTIONS } from "@/lib/admission-options";
import { CLINIC_OPTIONS, INSURANCE_OPTIONS } from "@/lib/patient-options";

export function AnalyticsHome() {
  const { data: session } = useSession();
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [insurance, setInsurance] = useState("all");
  const [clinic, setClinic] = useState("all");
  const [admissionType, setAdmissionType] = useState("all");
  const [lastMonths, setLastMonths] = useState("6");

  const chartEndDate = useMemo(() => new Date(), []);

  const chartStartDate = useMemo(() => {
    const months = lastMonths === "all" ? 12 : parseInt(lastMonths, 10);
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  }, [lastMonths]);

  const filters = useMemo(
    () => ({ insurance, clinic, admissionType, lastMonths }),
    [insurance, clinic, admissionType, lastMonths],
  );

  const { admissionsCount, admissionsCountByGroup, isLoading } =
    useAdmissionsCount(
      session as Parameters<typeof useAdmissionsCount>[0],
      filters,
    );

  const {
    pendingPatientsCount,
    pendingPatientsCountByGroup,
    isLoading: isPendingLoading,
  } = usePendingPatientsCount(
    session as Parameters<typeof usePendingPatientsCount>[0],
    filters,
  );

  const isDashboardLoading = isLoading || isPendingLoading || isChartLoading;

  return (
    <div className="w-full bg-background font-sans dark:bg-black">
      <main className="flex w-full flex-col gap-8 bg-white dark:bg-black pb-8">
        <header className="relative flex w-full items-start bg-accent px-14 py-4 dark:bg-accent-dark">
          <div className="flex flex-col items-start gap-4 w-full py-4">
            <h1 className="text-4xl font-bold text-black dark:text-white">
              Welcome back, {session?.user?.name || "User"}!
            </h1>
            <Separator className="w-full" />
            <div className="flex w-full flex-wrap items-center gap-4">
              <Field className="w-full max-w-48">
                <FieldLabel>Insurance</FieldLabel>
                <Select value={insurance} onValueChange={setInsurance}>
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Select an insurance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Insurance</SelectLabel>
                      <SelectItem value="all">All Insurances</SelectItem>
                      {INSURANCE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-full max-w-48">
                <FieldLabel>Clinic</FieldLabel>
                <Select value={clinic} onValueChange={setClinic}>
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Select a clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Clinics</SelectLabel>
                      <SelectItem value="all">All Clinics</SelectItem>
                      {CLINIC_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-full max-w-48">
                <FieldLabel>Type of Admission</FieldLabel>
                <Select value={admissionType} onValueChange={setAdmissionType}>
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Type</SelectLabel>
                      <SelectItem value="all">All Types</SelectItem>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="w-full max-w-48">
                <FieldLabel>Date Range</FieldLabel>
                <Select value={lastMonths} onValueChange={setLastMonths}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="12">Last 12 Months</SelectItem>
                      <SelectItem value="9">Last 9 Months</SelectItem>
                      <SelectItem value="6">Last 6 Months</SelectItem>
                      <SelectItem value="3">Last 3 Months</SelectItem>
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
              {isDashboardLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-semibold">{admissionsCount}</p>
                  <ul className="text-sm text-muted-foreground">
                    {admissionsCountByGroup.map((entry) => (
                      <li key={entry.group}>
                        {entry.group}: {entry.count}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="w-full max-w-3xs">
            <CardHeader className="flex items-center gap-2">
              <Eye />
              <CardTitle>Patients Pending</CardTitle>
            </CardHeader>
            <CardContent>
              {isDashboardLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-semibold">
                    {pendingPatientsCount}
                  </p>
                  <ul className="text-sm text-muted-foreground">
                    {pendingPatientsCountByGroup.map((entry) => (
                      <li key={entry.group}>
                        {entry.group}: {entry.count}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="mx-auto flex w-full flex-col gap-8 px-8">
          <Card className="mx-auto flex w-full flex-col gap-8 p-8 sm:px-8">
            <CardHeader className="flex items-center gap-2">
              <TrendingUpDown />
              <CardTitle>Admissions Trend</CardTitle>
              {isDashboardLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {chartStartDate?.toLocaleDateString()} -{" "}
                  {chartEndDate.toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <CardContent className="w-full py-6">
              <DashboardChart
                session={session as Parameters<typeof useAdmissionsCount>[0]}
                filters={filters}
                onLoadingChange={setIsChartLoading}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
