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
import { Command, Guild, timeAgoExtended } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import { MessagesSelect } from "@/lib/db/difference";

export type CommandData = MessagesSelect;

export function RecentCommands(props: {
  user: User | null;
  guild: Guild | null;
}) {
  const [recentCommands, setRecentCommands] = useState<CommandData[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { isError, error, mutateAsync } = useMutation({
    mutationKey: ["getGuildCommands", "dashboard"],
    mutationFn: async () =>
      betterFetch<CommandData[]>(
        `${env.NEXT_PUBLIC_API_URL}/modules/analytics/messages/${props.guild?.id}/commands`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${props.user?.user_id}`,
            "bearer-authorization": `${props.user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/analytics/${props.guild?.id}/command`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch recent commands, please refresh to try again."
            );
          },
        }
      ),
  });

  useEffect(() => {
    (async () => {
      const data = await mutateAsync();
      if (data) {
        setLoading(false);
        setRecentCommands(data.data as CommandData[]);
      }
    })();
  }, []);

  return (
    <Card className="border-blimp-border w-[35%] bg-dark-foreground  border">
      <CardHeader>
        <CardTitle>Recent Commands</CardTitle>
        <CardDescription className="max-w-[500px]">The past 15 commands ran in {props.guild?.name}.</CardDescription>
      </CardHeader>
      <CardContent>
        {recentCommands?.map((command, i) => {
          return (
            <div key={i} className="flex justify-between items-center py-1">
              <p className="font-regular text-sm">/{command.command}</p>
              <span className="text-xs opacity-30">
                {timeAgoExtended(command.created as Date)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
