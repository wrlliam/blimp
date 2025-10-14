"use client";

import DefaultInput from "@/components/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { env } from "@/env";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { APIEmbed, GuildBasedChannel } from "discord.js";
import MessageInput from "@/components/MessageInput";
import VariableHelp from "@/components/VariableHelp";
import { Button } from "@/components/ui/button";
import { formMessagePayload, MessagePayloadCreationData } from "@/lib/utils";
import { fetchChannels } from "@/components/fetchChannels";
import { User } from "@/lib/auth/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// I know this could be more perfomant or prettier. Leave me alone.

export type WelcomeAndGoodbyeWelcData = {
  ok: true;
  data: {
    welcomeMessage: boolean;
    welcomeMessageData: string;
    welcomeMessageChannel: string;
  };
};

export type GoodbyeWelcData = {
  ok: true;
  data: {
    goodbyeMessage: boolean;
    goodbyeMessageData: string;
    goodbyeMessageChannel: string;
  };
};

export function Welcome() {
  const [loading, setLoading] = useState(true);

  const { guild } = useGuildStore();
  const { user } = useUserStore();

  const [welcomeData, setWelcomeData] = useState<string>("");
  const [welcomeToggle, setWelcomeToggle] = useState(false);
  const [welcomeDataChannelId, setWelcomeDataChannelId] = useState("");

  const [message, setMessage] = useState("");
  const [embed, setEmbed] = useState<APIEmbed | undefined>();
  const [messageChannelId, setMessageChannelId] = useState("");
  const [channels, setChannels] = useState<GuildBasedChannel[]>([]);

  const channelFn = fetchChannels(guild?.id as string, user as User);

  const { isError, error, mutateAsync } = useMutation({
    mutationKey: ["getWelcomeModuledData", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        ok: boolean;
        data: WelcomeAndGoodbyeWelcData;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/welcome-and-goodbye/${guild?.id}/welcome`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/welcome-and-goodbye/${guild?.id}/welcome`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch welcome data, please refresh to try again."
            );
          },
        }
      ),
  });

  const { mutateAsync: updateWelcomeAsync } = useMutation({
    mutationKey: ["updateWelcomeModuledData", "dashboard"],
    mutationFn: async (data: WelcomeAndGoodbyeWelcData["data"]) =>
      betterFetch<{
        ok: boolean;
        data: WelcomeAndGoodbyeWelcData;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/welcome-and-goodbye/${guild?.id}/welcome`,
        {
          method: "POST",
          body: data,
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/welcome-and-goodbye/${guild?.id}/welcome`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to update welcome data, please refresh to try again."
            );
          },
        }
      ),
  });

  const updateData = () => {
    updateWelcomeAsync({
      welcomeMessage: welcomeToggle,
      welcomeMessageChannel: messageChannelId,
      welcomeMessageData: JSON.stringify(
        formMessagePayload({
          content: message,
          embeds: [embed],
        })
      ),
    })
      .then((data) => {
        console.log(data.data);
        if (data.data && data.data.ok) {
          toast.success("Successfully updated welcome message data.");
        } else {
          toast.error("Failed to update message data, please try again later.");
        }
      })
      .catch((e) => {
        toast.error("Failed to update message data, please try again later.");
      });
  };

  useEffect(() => {
    (async () => {
      const data = await mutateAsync();
      channelFn.loadChannels(setLoading, setChannels);
      if (data && data.data) {
        setLoading(false);
        setWelcomeToggle(data.data.data.data.welcomeMessage);

        setWelcomeDataChannelId(data.data.data.data.welcomeMessageChannel);
        setMessageChannelId(data.data.data.data.welcomeMessageChannel);

        const welcomeDataNullable = data.data.data.data.welcomeMessageData
          ? data.data.data.data.welcomeMessageData
          : JSON.stringify({});
        setWelcomeData(welcomeDataNullable);

        const { content, embeds } = JSON.parse(
          welcomeDataNullable
        ) as MessagePayloadCreationData;

        setMessage(content ? content : "");

        if (embeds) {
          setEmbed(embeds[0]);
        }
      }
    })();
  }, []);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome Messages</CardTitle>
          <CardDescription className="max-w-[500px] mt-1">
            Welcome messages make new members feel right at home. Set up a
            custom greeting, add personal touches, and give everyone a warm
            first impression of your community.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-3">
            <DefaultInput
              className="flex flex-row mb-[1.5rem] items-center gap-4"
              title="Toggle welcome messages"
            >
              <Switch
                className="cursor-pointer"
                checked={welcomeToggle}
                onCheckedChange={() => setWelcomeToggle(!welcomeToggle)}
              />
              <VariableHelp />
            </DefaultInput>

            <DefaultInput
              className="flex flex-row mb-[1.5rem] items-center gap-4"
              title="Select a welcome channel"
            >
              <Select
                onValueChange={(v) => setMessageChannelId(v)}
                value={messageChannelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem> */}
                  {channels
                    .filter((f) => f.type === 0)
                    .map((channel, i) => {
                      return (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </DefaultInput>
          </div>
          <MessageInput
            message={message}
            setMessage={setMessage}
            embed={embed}
            setEmbed={setEmbed}
          />
          <div className="flex flex-row gap-3">
            <Button variant={"main"} onClick={() => updateData()}>
              Save welcome message
            </Button>
            <Button
              onClick={() => {
                try {
                  const { content, embeds } = JSON.parse(
                    welcomeData
                  ) as MessagePayloadCreationData;

                  setMessage(content ? content : "");
                  setMessageChannelId(welcomeDataChannelId);
                  if (embeds) {
                    setEmbed(embeds[0]);
                  }

                  toast.success("Reset welcome message fields.");
                } catch (e) {
                  toast.error(
                    "Failed to reset welcome message fields, please try again."
                  );
                }
              }}
              variant={"secondary"}
            >
              Reset message data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Goodbye() {
  const [loading, setLoading] = useState(true);

  const { guild } = useGuildStore();
  const { user } = useUserStore();

  const [data, setData] = useState<string>("");
  const [toggle, setToggle] = useState(false);
  const [dataChannelId, setDataChannelId] = useState("");

  const [message, setMessage] = useState("");
  const [embed, setEmbed] = useState<APIEmbed | undefined>();
  const [messageChannelId, setMessageChannelId] = useState("");
  const [channels, setChannels] = useState<GuildBasedChannel[]>([]);

  const channelFn = fetchChannels(guild?.id as string, user as User);

  const { isError, error, mutateAsync } = useMutation({
    mutationKey: ["getGoodbyeModuledData", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        ok: boolean;
        data: GoodbyeWelcData;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/welcome-and-goodbye/${guild?.id}/goodbye`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/welcome-and-goodbye/${guild?.id}/goodbye`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch welcome data, please refresh to try again."
            );
          },
        }
      ),
  });

  const { mutateAsync: updateGoodbyeAsync } = useMutation({
    mutationKey: ["updateGoodbyeModuledData", "dashboard"],
    mutationFn: async (data: GoodbyeWelcData["data"]) =>
      betterFetch<{
        ok: boolean;
        data: GoodbyeWelcData;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/welcome-and-goodbye/${guild?.id}/goodbye`,
        {
          method: "POST",
          body: data,
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/welcome-and-goodbye/${guild?.id}/goodbye`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to update welcome data, please refresh to try again."
            );
          },
        }
      ),
  });

  const updateData = () => {
    
    updateGoodbyeAsync({
      goodbyeMessage: toggle,
      goodbyeMessageChannel: messageChannelId,
      goodbyeMessageData: JSON.stringify(
        formMessagePayload({
          content: message,
          embeds: [embed],
        })
      ),
    })
      .then((data) => {
        console.log(data.data);
        if (data.data && data.data.ok) {
          toast.success("Successfully updated welcome message data.");
        } else {
          toast.error("Failed to update message data, please try again later.");
        }
      })
      .catch((e) => {
        toast.error("Failed to update message data, please try again later.");
      });
  };

  useEffect(() => {
    (async () => {
      const data = await mutateAsync();
      channelFn.loadChannels(setLoading, setChannels);
      if (data && data.data) {
        setLoading(false);
        setToggle(data.data.data.data.goodbyeMessage);

        setDataChannelId(data.data.data.data.goodbyeMessageChannel);
        setMessageChannelId(data.data.data.data.goodbyeMessageChannel);

        const goodbyeMessageData = data.data.data.data.goodbyeMessageData
          ? data.data.data.data.goodbyeMessageData
          : JSON.stringify({});
        setData(goodbyeMessageData);

        const { content, embeds } = JSON.parse(
          goodbyeMessageData
        ) as MessagePayloadCreationData;

        setMessage(content ? content : "");

        if (embeds) {
          setEmbed(embeds[0]);
        }
      }
    })();
  }, []);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Goodbye Messages</CardTitle>
          <CardDescription className="max-w-[500px] mt-1">
            Goodbye messages let you send members off on a positive note.
            Customize a farewell, add personal touches, and keep your
            community’s tone friendly and consistent—even when people leave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-3">
            <DefaultInput
              className="flex flex-row mb-[1.5rem] items-center gap-4"
              title="Toggle goodbye messages"
            >
              <Switch
                className="cursor-pointer"
                checked={toggle}
                onCheckedChange={() => setToggle(!toggle)}
              />
              <VariableHelp />
            </DefaultInput>

            <DefaultInput
              className="flex flex-row mb-[1.5rem] items-center gap-4"
              title="Select a goodbye channel"
            >
              <Select
                onValueChange={(v) => setMessageChannelId(v)}
                value={messageChannelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem> */}
                  {channels
                    .filter((f) => f.type === 0)
                    .map((channel, i) => {
                      return (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </DefaultInput>
          </div>
          <MessageInput
            message={message}
            setMessage={setMessage}
            embed={embed}
            setEmbed={setEmbed}
          />
          <div className="flex flex-row gap-3">
            <Button variant={"main"} onClick={() => updateData()}>
              Save goodbye message
            </Button>
            <Button
              onClick={() => {
                try {
                  const { content, embeds } = JSON.parse(
                    data
                  ) as MessagePayloadCreationData;

                  setMessage(content ? content : "");
                  setMessageChannelId(dataChannelId);
                  if (embeds) {
                    setEmbed(embeds[0]);
                  }

                  toast.success("Reset welcome message fields.");
                } catch (e) {
                  toast.error(
                    "Failed to reset goodbye message fields, please try again."
                  );
                }
              }}
              variant={"secondary"}
            >
              Reset message data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WeclomeAndGoodbye() {
  return (
    <div className="flex flex-col gap-3">
      <Welcome />
      <Goodbye />
    </div>
  );
}
