"use client";

import { useEffect, useState } from "react";
import { APIEmbed, GuildBasedChannel } from "discord.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import EmbedCreator from "@/components/EmbedCreator";
import MessageInput from "@/components/MessageInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DefaultInput from "@/components/Input";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { useMutation } from "@tanstack/react-query";
import { betterFetch } from "@better-fetch/fetch";
import { env } from "@/env";
import { User } from "@/lib/auth/client";
import { fetchChannels } from "@/components/fetchMass";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formMessagePayload, MessagePayloadCreationData } from "@/lib/utils";
import { MessageAndEmbedsSelect } from "@/lib/db/difference";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type CreationData = {
  channelId: string;
  name: string;
  data: string;
};

export default function EmbedsAndMessages() {
  const { guild } = useGuildStore();
  const { user } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [embed, setEmbed] = useState<APIEmbed | undefined>();
  const [title, setTitle] = useState("");
  const [message, setMessages] = useState("");
  const [messageChannelId, setMessageChannelId] = useState("");
  const [channels, setChannels] = useState<GuildBasedChannel[]>([]);

  const [previousMessages, setPreviousMessages] = useState<
    MessageAndEmbedsSelect[]
  >([]);

  const channelFn = fetchChannels(guild?.id as string, user as User);

  const [updatedTitle, setUpdatedTitle] = useState("");
  const [updatedMessage, setUpdatedMessage] = useState("");
  const [updatedEmbed, setUpdatedEmbed] = useState<APIEmbed | undefined>();

  const { mutateAsync: createMessageOrEmbedAsync } = useMutation({
    mutationKey: ["updateWelcomeModuledData", "dashboard"],
    mutationFn: async (data: CreationData) =>
      betterFetch<{
        ok: boolean;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/embeds-and-messages/${guild?.id}`,
        {
          method: "POST",
          body: data,
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onSuccess: () => {
            toast.success("Successfully created new message.");
            setTimeout(() => {
              window.location.href = window.location.href;
            }, 1000);
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/embeds-and-messages/${guild?.id}/`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to update message data, please refresh to try again."
            );
          },
        }
      ),
  });

  const { mutateAsync: getMessageOrEmbedAsync } = useMutation({
    mutationKey: ["getMessageOrEmbed", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        ok: boolean;
        data: MessageAndEmbedsSelect[];
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/embeds-and-messages/${guild?.id}`,
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
              "Failed to get message data, please refresh to try again."
            );
          },
        }
      ),
  });

  const { mutateAsync: updateMessageOrEmbedAsync } = useMutation({
    mutationKey: ["updateMessageOrEmbed", "dashboard"],
    mutationFn: async (data: {
      messageId: string;
      data: {
        name: string;
        data: string;
      };
    }) =>
      betterFetch<{
        ok: boolean;
        msg: String;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/embeds-and-messages/${guild?.id}/update`,
        {
          method: "POST",
          body: data,
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onSuccess: () => {
            toast.success("Successfully updated previous message.");
            setTimeout(() => {
              window.location.href = window.location.href;
            }, 1000);
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/embeds-and-messages/${guild?.id}/update`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to update message data, please refresh to try again."
            );
          },
        }
      ),
  });

  const { mutateAsync: deleteMessageOrEmbedAsync } = useMutation({
    mutationKey: ["deleteMessageOrEmbed", "dashboard"],
    mutationFn: async (data: { messageId: string }) =>
      betterFetch<{
        ok: boolean;
        msg: String;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/embeds-and-messages/${guild?.id}`,
        {
          method: "DELETE",
          body: {
            messageId: data.messageId,
          },
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onSuccess: () => {
            toast.success("Successfully deleted message.");
            setTimeout(() => {
              window.location.href = window.location.href;
            }, 1000);
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/embeds-and-messages/${guild?.id}/`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to delete message data, please refresh to try again."
            );
          },
        }
      ),
  });

  useEffect(() => {
    (async () => {
      channelFn.loadChannels(setLoading, setChannels);
      const data = await getMessageOrEmbedAsync();
      if (data && data.data) {
        setPreviousMessages(data.data.data as MessageAndEmbedsSelect[]);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Messages and Embeds</CardTitle>
          <CardDescription className="max-w-[500px] mt-1">
            Custom messages and embeds help you share important info in style.
            Use them for rules, updates, or announcements—clear, organized, and
            perfectly tailored to your server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-3">
            <DefaultInput title="Title" className="mb-[1.5rem]">
              <Input
                className="min-w-[600px]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </DefaultInput>
            <DefaultInput title="Select a message channel">
              <Select
                onValueChange={(v) => setMessageChannelId(v)}
                value={messageChannelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
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
            embed={embed}
            setEmbed={setEmbed}
            message={message}
            setMessage={setMessages}
          />

          <Button
            onClick={() =>
              createMessageOrEmbedAsync({
                channelId: messageChannelId,
                data: JSON.stringify(
                  formMessagePayload({
                    content: message,
                    embeds: [embed],
                  })
                ),
                name: title,
              })
            }
          >
            Create message
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current Messages and Embeds</CardTitle>
        </CardHeader>
        <CardContent>
          {previousMessages.length <= 0 ? (
            <p className="opacity-20">No previous messages</p>
          ) : (
            <Accordion type="single">
              {previousMessages.map((pMessage, i) => {
                const channel = channels.find(
                  (f) => f.id === pMessage.channelId
                );
                const { embeds, content } = formMessagePayload(
                  JSON.parse(
                    pMessage.body as string
                  ) as MessagePayloadCreationData
                );
                return (
                  <AccordionItem value={pMessage.id} key={i}>
                    <AccordionTrigger
                      onClick={() => {
                        setUpdatedTitle(pMessage.name as string);
                        setUpdatedMessage(content as string);
                        setUpdatedEmbed(
                          embeds && embeds.length > 0
                            ? (embeds[0] as APIEmbed)
                            : undefined
                        );
                      }}
                    >
                      <div className="flex flex-row justify-center gap-3">
                        <p>{pMessage.name}</p>
                        <p className="text-xs opacity-25">
                          {channel
                            ? `#${channel.name}`
                            : "Unable to find channel name"}
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <DefaultInput title="Title" className="my-[2rem]">
                        <Input
                          value={updatedTitle}
                          onChange={(e) => setUpdatedTitle(e.target.value)}
                        />
                      </DefaultInput>
                      <MessageInput
                        embed={updatedEmbed}
                        setEmbed={setUpdatedEmbed}
                        setMessage={setUpdatedMessage}
                        message={updatedMessage as string}
                      />

                      <div className="flex flex-row gap-3">
                        <Button
                          variant={"main"}
                          onClick={() =>
                            updateMessageOrEmbedAsync({
                              messageId: pMessage.id,
                              data: {
                                name: updatedTitle,
                                data: JSON.stringify(
                                  formMessagePayload({
                                    content: updatedMessage,
                                    embeds: [updatedEmbed],
                                  })
                                ),
                              },
                            })
                          }
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant={"destructive"}
                          onClick={() =>
                            deleteMessageOrEmbedAsync({
                              messageId: pMessage.id,
                            })
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
