"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { User } from "@/lib/auth/client";
import { betterFetch } from "@better-fetch/fetch";
import { env } from "@/env";
import { useMutation } from "@tanstack/react-query";
import { Guild } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";

const chartConfig = {
  total: {
    label: "Messages",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export type ChartData = {
  day: number,
  count: number
}[];

export function MessageLineChart(props: {
  user: User | null;
  guild: Guild | null;
}) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const { isError, error, mutateAsync } = useMutation({
    mutationKey: ["getGuildMessages", "dashboard"],
    mutationFn: async () =>
      betterFetch<ChartData>(
        `${env.NEXT_PUBLIC_API_URL}/modules/analytics/messages/${props.guild?.id}`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${props.user?.user_id}`,
            "bearer-authorization": `${props.user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/analytics/${props.guild?.id}`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch message analytics, please refresh to try again."
            );
          },
        }
      ),
  });

  useEffect(() => {
    (async () => {
      const data = await mutateAsync();
      if(data) {
        setLoading(false)
        setChartData(data.data as ChartData)
      }
    })();
  }, []);

  return (
    <Card className="border-blimp-border w-[35%] bg-dark-foreground  border">
      <CardHeader>
        <CardTitle>Messages Per Day</CardTitle>
        <CardDescription>The past month of messages.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader />
        ) : (
          <ChartContainer className="ml-[-3rem]" config={chartConfig}>
            <LineChart accessibilityLayer data={chartData as ChartData}>
              <CartesianGrid vertical={false} />
              <YAxis dataKey={"total"} tickLine={false} tickMargin={1} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Line
                dataKey="total"
                className="mb-[2rem["
                type="linear"
                dot={false}
                stroke="var(--color-default-accent)"
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
