"use client";

import Loader from "@/components/loader";
import { Card, CardContent } from "@/components/ui/card";
import { env } from "@/env";
import { User } from "@/lib/auth/client";
import { GuildLevelSelect, LevelingSelect } from "@/lib/db/difference";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { tw } from "@/lib/utils";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { set } from "date-fns";
import { Guild, GuildMember } from "discord.js";
import { Badge } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type PassedDownProps = {
  guild: Guild | null;
  user: User | null;
};

export default function Leveling() {
  const { user } = useUserStore();
  const { guild } = useGuildStore();

  return (
    <div className="flex flex-row gap-3">
      <LevelingConfig />
      <LevelingLeaderboard guild={guild} user={user} />
    </div>
  );
}

export function LevelingConfig() {
  return <Card className="flex w-[70%]"></Card>;
}

type MixedLevelData = LevelingSelect & { user: GuildMember };
type MixedLevelDataArray = (
  | (MixedLevelData & { level: GuildLevelSelect })
  | MixedLevelData
)[];

export function LevelingLeaderboard({
  user,
  guild,
  ...props
}: PassedDownProps) {
  const [levelingData, setLevelingData] = useState<MixedLevelDataArray>([]);
  const [loading, setLoading] = useState(true);

  const { mutateAsync: fetchLevelingAsync } = useMutation({
    mutationKey: ["fetchLevelData", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        ok: boolean;
        data: {
          data: MixedLevelDataArray;
        };
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/leveling/${guild?.id}/leaderboard`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },

          onRequest: () => {
            console.log(
              `Sending request to /modules/embeds-and-messages/${guild?.id}/`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch leaderboard data, please refresh to try again."
            );
          },
        }
      ),
  });

  useEffect(() => {
    (async () => {
      const data = await fetchLevelingAsync();
      if (data && data.data) {
        setLevelingData(data.data.data.data);
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card className="flex w-[29.5%]">
      <CardContent>
        {loading ? (
          <Loader />
        ) : (
          <>
            {" "}
            {levelingData.map((d, i) => {
              return (
                <div key={d.id} className="flex flex-row justify-between py-[1.5rem] px-[0.5rem]">
                  {/* <LevelPosition spot={i + 1} /> */}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LevelPosition({ spot }: { spot: number }) {
  const situations = {
    1: tw`text-default-accent`,
    2: tw`text-stone-300`,
    3: tw`text-amber-700/60`,
    default: "",
  };

  const keys = Object.keys(situations);
  return (
    <div
      className={`px-3 py-1 rounded-md ${keys.includes(spot.toString()) ? situations[`${spot as keyof typeof situations}`] : situations["default"]}`}
    >
      <div className="flex w-fit items-center justify-center">
        <Badge />
        <div className="flex text-xs w-full h-full z-[10] absolute justify-center items-center">{spot}</div>
      </div>
    </div>
  );
}
