"use client";

import { MessageLineChart } from "@/components/dashboard/analytics/MessageLineChart";
import { RecentCommands } from "@/components/dashboard/analytics/RecentCommands";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { Guild } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useUserStore();
  const { guild } = useGuildStore();

  const data = { user: user, guild: guild as unknown as Guild };
  return (
    <div className="flex flex-col gap-2 w-full">
      <MessageLineChart {...data} />
      <RecentCommands {...data} />
    </div>
  );
}
