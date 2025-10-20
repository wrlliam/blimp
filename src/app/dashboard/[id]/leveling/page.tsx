"use client";

import DefaultInput from "@/components/Input";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { env } from "@/env";
import { User } from "@/lib/auth/client";
import {
  GuildLevelMultiSelect,
  GuildLevelSelect,
  LevelingSelect,
} from "@/lib/db/difference";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { tw } from "@/lib/utils";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { set } from "date-fns";
import { Guild, GuildMember, Role } from "discord.js";
import { Badge, PlusIcon } from "lucide-react";
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
      <LevelingConfig guild={guild} user={user} />
      <LevelingLeaderboard guild={guild} user={user} />
    </div>
  );
}

export function LevelingConfig({ user, guild }: PassedDownProps) {
  const [toggle, setToggle] = useState(false);
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<{
    levels: (GuildLevelSelect & { role: Role | null })[];
    multipliers: GuildLevelMultiSelect[];
  }>();

  const { mutateAsync: fetchLevelingAsync } = useMutation({
    mutationKey: ["fetchLevelData", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        data: {
          ok: boolean;
          data: {
            toggled: boolean;
            levels: (GuildLevelSelect & { role: Role | null })[];
            multipliers: GuildLevelMultiSelect[];
          };
        };
      }>(`${env.NEXT_PUBLIC_API_URL}/modules/leveling/${guild?.id}/`, {
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
            "Failed to fetch leveling data, please refresh to try again."
          );
        },
      }),
  });

  useEffect(() => {
    (async () => {
      const data = await fetchLevelingAsync();
      console.log(data.data?.data.data);
      if (data && data.data) {
        setLoading(false);
        setToggle(data.data.data.data.toggled);
        setData({
          levels: data.data.data.data.levels,
          multipliers: data.data.data.data.multipliers,
        });
      }
    })();
  }, []);

  return (
    <Card className="flex w-[70%]">
      <CardHeader>
        <CardTitle>Leveling Configuration</CardTitle>
        <CardDescription className="max-w-[500px]">
          Leveling keeps your community active and engaged. Members earn XP by
          chatting, climbing ranks, and unlocking roles—it’s a fun way to reward
          participation and build interaction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DefaultInput
          className="flex flex-row gap-4 items-center"
          title="Toggle"
        >
          <Switch
            checked={toggle}
            onCheckedChange={() => setToggle(!toggle)}
            className="cursor-pointer"
          />
        </DefaultInput>

        <div className="flex my-[2rem] flex-row justify-between items-center">
          <h1 className="leading-none font-semibold">Levels</h1>
          <Button variant={"secondary"} className="cursor-pointer">
            Add Level
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {data?.levels.map((level, i) => {
            return (
              <div key={i} className="flex flex-row justify-between">
                <div className="flex flex-row  items-center gap-3">
                  <div className="bg-input/30 text-xs  px-2 py-1 rounded-md border border-blimp-border">
                    {level.level}
                  </div>
                  <RoleDisplay role={level.role} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function RoleDisplay({ role }: { role: Role | null }) {
  return (
    <div
      style={{
        border: `1px solid ${role?.hexColor}`,
      }}
      className="rounded-lg px-2"
    >
      {role?.name}
    </div>
  );
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
                <div
                  key={d.id}
                  className="flex flex-row justify-between py-[1.5rem] px-[0.5rem]"
                >
                  <LevelPosition spot={i + 1} />
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
        <div className="flex text-xs w-full h-full z-[10] absolute justify-center items-center">
          {spot}
        </div>
      </div>
    </div>
  );
}
