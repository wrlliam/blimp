import { env } from "@/env";
import { User } from "@/lib/auth/client";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { GuildBasedChannel } from "discord.js";
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
