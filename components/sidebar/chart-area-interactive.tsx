"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  enrollments: {
    label: "Enrollments",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface ChartAreaInteractiveProps {
  data: { date: string; enrollments: number }[];
}

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps) {
  const chartData = React.useMemo(() => data ?? [], [data]);

  const totalEnrollmentsNumber = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.enrollments, 0),
    [chartData]
  );

  const hasEnrollmentData = React.useMemo(
    () => chartData.some((item) => item.enrollments > 0),
    [chartData]
  );

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Enrollments</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total Enrollments for the last 30 days: {totalEnrollmentsNumber}
          </span>
          <span className="@[540px]/card:hidden">
            Last 30 days: {totalEnrollmentsNumber}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {!chartData.length || !hasEnrollmentData ? (
          <div className="flex h-[250px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No enrollment data available for the last 30 days.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                left: 0,
                right: 12,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[160px]"
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                }
              />
              <Bar
                dataKey="enrollments"
                fill="var(--color-enrollments)"
                radius={[6, 6, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}