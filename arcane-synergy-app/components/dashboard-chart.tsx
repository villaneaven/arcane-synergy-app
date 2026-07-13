"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

type SessionWithAccessToken =
  | {
      access_token?: string;
    }
  | null
  | undefined;

type DashboardFilters = {
  group: string;
  insurance: string;
  clinic: string;
  admissionType: string;
  lastMonths: string;
};

type MonthlyAdmissionCount = {
  month: string;
  monthName: string;
  year: number;
  count: number;
};

const chartConfig = {
  admissions: {
    label: "Admissions",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export function DashboardChart({
  session,
  filters,
  onLoadingChange,
}: {
  session: SessionWithAccessToken;
  filters: DashboardFilters;
  onLoadingChange?: (isLoading: boolean) => void;
}) {
  const [chartData, setChartData] = useState<MonthlyAdmissionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const queryString = useMemo(() => {
    const queryParams = new URLSearchParams();

    if (filters.group !== "all") queryParams.set("group", filters.group);
    if (filters.insurance !== "all") {
      queryParams.set("insurance", filters.insurance);
    }
    if (filters.clinic !== "all") queryParams.set("clinic", filters.clinic);
    if (filters.admissionType !== "all") {
      queryParams.set("admissionType", filters.admissionType);
    }
    if (filters.lastMonths !== "all") {
      queryParams.set("lastMonths", filters.lastMonths);
    }

    return queryParams.toString();
  }, [filters]);

  const fetchChartData = useCallback(async () => {
    const accessToken = session?.access_token;

    try {
      setIsLoading(true);

      const response = await fetch(
        `http://localhost:5201/api/Admissions/count/monthly${
          queryString ? `?${queryString}` : ""
        }`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch monthly admissions count");
      }

      const data: MonthlyAdmissionCount[] = await response.json();
      setChartData(data);
    } catch (error) {
      console.error("Error fetching monthly admissions count:", error);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, [queryString, session]);

  useEffect(() => {
    if (session) {
      void fetchChartData();
    }
  }, [session, fetchChartData]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const chartRows = chartData.map((item) => ({
    month: `${item.monthName} ${item.year}`,
    admissions: item.count,
  }));

  if (isLoading) {
    return <Skeleton className="h-70 w-full" />;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-50 max-h-70 w-full">
      <LineChart accessibilityLayer data={chartRows}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis
          dataKey="admissions"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          label={{ value: "Count", angle: -90, position: "insideLeft" }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="admissions"
          fill="var(--color-admissions)"
          stroke="var(--color-admissions)"
          radius={4}
        />
      </LineChart>
    </ChartContainer>
  );
}
