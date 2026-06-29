"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartData = [
  { month: "January", admissions: 186 },
  { month: "February", admissions: 305 },
  { month: "March", admissions: 237 },
  { month: "April", admissions: 73 },
  { month: "May", admissions: 209 },
  { month: "June", admissions: 214 },
];

const chartConfig = {
  admissions: {
    label: "Admissions",
    color: "#ffffff",
  },
} satisfies ChartConfig;

export function DashboardChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-50 w-full">
      <LineChart accessibilityLayer data={chartData}>
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
