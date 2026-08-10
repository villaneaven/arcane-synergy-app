"use client";

import { useEffect, useMemo, useState } from "react";
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
import { GROUP_OPTIONS } from "@/lib/patient-options";
import {
  normalizeGroupBreakdown,
  UNASSIGNED_GROUP,
  type RawGroupCount,
} from "@/lib/group-breakdown";

type SessionWithAccessToken =
  | {
      access_token?: string;
    }
  | null
  | undefined;

type DashboardFilters = {
  insurance: string;
  clinic: string;
  admissionType: string;
  lastMonths: string;
};

type MonthlyAdmissionCount = {
  month: string;
  monthName: string;
  year: number;
  total: number;
  byGroup: RawGroupCount[];
};

const TOTAL_KEY = "Total";

const GROUP_ORDER = [...GROUP_OPTIONS, UNASSIGNED_GROUP];

const GROUP_COLORS: Record<string, { light: string; dark: string }> = {
  DMC: { light: "#2B3086", dark: "#2B3086" },
  RGVAIMS: { light: "#707171", dark: "#707171" },
  PJP: { light: "#44B549", dark: "#44B549" },
  [UNASSIGNED_GROUP]: { light: "#00B7C4", dark: "#8AD3E1" },
};

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

  const accessToken = session?.access_token;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let ignore = false;

    (async () => {
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
        if (!ignore) setChartData(data);
      } catch (error) {
        console.error("Error fetching monthly admissions count:", error);
        if (!ignore) setChartData([]);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [accessToken, queryString]);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const chartConfig = useMemo(
    () =>
      ({
        ...Object.fromEntries(
          GROUP_ORDER.map((key) => [
            key,
            { label: key, theme: GROUP_COLORS[key] },
          ]),
        ),
        [TOTAL_KEY]: { label: "Total", color: "var(--foreground)" },
      }) satisfies ChartConfig,
    [],
  );

  const chartRows = useMemo(
    () =>
      chartData.map((item) => {
        const row: Record<string, string | number> = {
          month: `${item.monthName} ${item.year}`,
          [TOTAL_KEY]: item.total,
        };
        for (const entry of normalizeGroupBreakdown(item.byGroup)) {
          row[entry.group] = entry.count;
        }
        return row;
      }),
    [chartData],
  );

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
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          allowDecimals={false}
          label={{
            value: "Admissions Count",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {GROUP_ORDER.map((key) => (
          <Line
            key={key}
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={{
              r: 4,
              fill: `var(--color-${key})`,
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            activeDot={{ r: 5 }}
          />
        ))}
        <Line
          dataKey={TOTAL_KEY}
          stroke={`var(--color-${TOTAL_KEY})`}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{
            r: 4,
            fill: `var(--color-${TOTAL_KEY})`,
            stroke: "var(--background)",
            strokeWidth: 2,
          }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
