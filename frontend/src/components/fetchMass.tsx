import { env } from "@/env";
import { User } from "@/lib/auth/client";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { GuildBasedChannel, Role } from "discord.js";
import { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

type ChannelReturns = {
  ok: boolean;
  data: {
    data: GuildBasedChannel[];
  };
};

export const fetchChannels = (guildId: string, user: User) => {
  const { isError, error, mutateAsync } = useMutation({
    mutationKey: ["getChannels", "dashboard"],
    mutationFn: async () =>
      betterFetch<ChannelReturns>(
        `${env.NEXT_PUBLIC_API_URL}/dash/guild/${guildId}/channels`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(`Sending request to /dash/guilds/${guildId}/channels`);
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch channel data, please refresh to try again."
            );
          },
        }
      ),
  });
  return {
    loadChannels: async (
      setLoading: Dispatch<SetStateAction<boolean>>,
      setState: Dispatch<SetStateAction<ChannelReturns["data"]["data"]>>
    ) => {
      const data = await mutateAsync();
      if (data.data?.data) {
        setState(data.data?.data.data);
        setLoading(false);
      }
    },
  };
};

type RoleReturns = {
  ok: boolean;
  data: { roles: Role[]; highestBotRole: Role };
};

export const fetchRoles = (guildId: string, user: User) => {
  const { isError, error, mutateAsync } = useMutation({
    mutationKey: ["getRoles", "dashboard"],
    mutationFn: async () =>
      betterFetch<RoleReturns>(
        `${env.NEXT_PUBLIC_API_URL}/dash/guild/${guildId}/roles`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(`Sending request to /dash/guilds/${guildId}/roles`);
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch role data, please refresh to try again."
            );
          },
        }
      ),
  });
  return {
    loadRoles: async (
      setLoading: Dispatch<SetStateAction<boolean>>,
      setState: Dispatch<SetStateAction<RoleReturns["data"]["roles"]>>
    ) => {
      const data = await mutateAsync();
      console.log(data.data?.data);
      if (data.data?.data && data.data.data.roles) {
        setState(
          data.data?.data.roles.filter(
            (f) =>
              !f.managed &&
              f.rawPosition < data.data.data.highestBotRole.rawPosition
          )
        );
        setLoading(false);
      }
    },
  };
};
