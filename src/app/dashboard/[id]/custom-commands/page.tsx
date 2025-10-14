"use client";
import EmbedCreator from "@/components/EmbedCreator";
import DefaultInput from "@/components/Input";
import Loader from "@/components/loader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/env";
import { CCommandSelect } from "@/lib/db/difference";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { formMessagePayload } from "@/lib/utils";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { cc } from "bun:ffi";
import { APIEmbed } from "discord.js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CustomCommands() {
  const router = useRouter();
  const [prefix, setPrefix] = useState("!");
  const [customCommands, setCustomCommands] = useState<CCommandSelect[]>();

  const [search, setSearch] = useState("");

  const [commandName, setCommandName] = useState<string>("");
  const [message, setMessage] = useState("");
  const [embed, setEmbed] = useState<APIEmbed | undefined>();

  const [loading, setLoading] = useState(true);
  const { guild } = useGuildStore();
  const { user } = useUserStore();

  const { isError, error, mutateAsync } = useMutation({
    mutationKey: ["getCustomCommandPrefix", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        ok: boolean;
        data: string;
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/custom-commands/${guild?.id}/prefix`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/custom-commands/${guild?.id}/prefix`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch custom custom command prefix, please refresh to try again."
            );
          },
        }
      ),
  });

  const { mutateAsync: customCommandAsync } = useMutation({
    mutationKey: ["getCustomCommands", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        ok: boolean;
        data: CCommandSelect[];
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/custom-commands/${guild?.id}/all`,
        {
          method: "GET",
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onRequest: () => {
            console.log(
              `Sending request to /modules/custom-commands/${guild?.id}/all`
            );
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to all custom custom commands, please refresh to try again."
            );
          },
        }
      ),
  });

  const submitPrefix = () =>
    betterFetch<{
      ok: boolean;
      prefix: string;
    }>(
      `${env.NEXT_PUBLIC_API_URL}/modules/custom-commands/${guild?.id}/prefix`,
      {
        method: "POST",
        body: {
          prefix: prefix,
        },
        headers: {
          "bearer-user-id": `${user?.user_id}`,
          "bearer-authorization": `${user?.authentication_token}`,
        },
        onRequest: () => {
          console.log(
            `Sending request to /modules/custom-commands/${guild?.id}/prefix`
          );
        },
        onError: (error: any) => {
          console.error("API request failed:", error);
          toast.error(
            "Failed to update custom custom command prefix, please refresh to try again."
          );
        },
      }
    ).then((data) => {
      if (data.data?.ok) {
        toast.success(`Custom command prefix has been updated to "${prefix}"`);
      }
    });

  const createCommandLogic = () => {
    if (!commandName) {
      toast.error("Please provide a command name.");
      return;
    }

    if (!message && !embed) {
      toast.error("Please provide a message or embed.");
      return;
    }

    betterFetch<{
      ok: boolean;
      id: string;
    }>(`${env.NEXT_PUBLIC_API_URL}/modules/custom-commands/${guild?.id}`, {
      method: "POST",
      body: {
        name: commandName,
        data: JSON.stringify(
          formMessagePayload({
            content: message,
            embeds: [embed],
          })
        ),
      },
      headers: {
        "bearer-user-id": `${user?.user_id}`,
        "bearer-authorization": `${user?.authentication_token}`,
      },
      onRequest: () => {
        console.log(
          `Sending request to /modules/custom-commands/${guild?.id}/`
        );
      },
      onError: (error: any) => {
        console.error("API request failed:", error);
        toast.error(
          "Failed to create custom command, please refresh to try again."
        );
      },
    }).then((data) => {
      if (data.data?.ok) {
        toast.success("Created command successfully.");
        router.push(window.location.href);
        router.forward();
      }
    });
  };

  const deleteCommandLogic = (id: string, name: string) => {
    betterFetch<{
      ok: boolean;
      msg: string;
    }>(`${env.NEXT_PUBLIC_API_URL}/modules/custom-commands/${guild?.id}`, {
      method: "DELETE",
      body: {
        id,
      },
      headers: {
        "bearer-user-id": `${user?.user_id}`,
        "bearer-authorization": `${user?.authentication_token}`,
      },
      onRequest: () => {
        console.log(
          `Sending request to /modules/custom-commands/${guild?.id}/`
        );
      },
      onError: (error: any) => {
        console.error("API request failed:", error);
        toast.error(
          "Failed to delete custom command, please refresh to try again."
        );
      },
    }).then((data) => {
      if (data.data?.ok) {
        toast.success(`Successfullyed deleted command "${prefix}${name}"`);
        router.push(window.location.href);
        router.forward();
      }
    });
  };

  useEffect(() => {
    (async () => {
      const data = await mutateAsync();
      const ccData = await customCommandAsync();
      if (data && data.data) {
        setLoading(false);
        setPrefix(data.data?.data as string);
      }

      if (ccData && ccData.data) {
        setLoading(false);
        setCustomCommands(ccData.data.data);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>Custom Commands</CardTitle>
          <CardDescription className="max-w-[500px]">
            Custom commands let you personalize your server. Create them once,
            and users can trigger them with your set prefix—simple, fun, and
            uniquely yours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader />
          ) : (
            <DefaultInput title="Command Prefix">
              <Input
                onChange={(e) => {
                  setPrefix(e.target.value.split(" ").join("-"));
                }}
                placeholder="!"
                value={prefix}
              />

              <Button className="mt-4" onClick={() => submitPrefix()}>
                Save Changes
              </Button>
            </DefaultInput>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-y-scroll">
          <div className="flex flex-row gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="cursor-pointer">Create new command</Button>
              </DialogTrigger>
              <DialogOverlay>
                <DialogContent className="w-fit">
                  <DialogHeader>
                    <DialogTitle>Create command</DialogTitle>
                    <DialogDescription>
                      The beginnings of every command - create a name/tag and
                      build a response.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col gap-3">
                    <DefaultInput title="Tag">
                      <Input
                        value={commandName}
                        onChange={(e) => {
                          setCommandName(e.target.value.split(" ").join("-"));
                        }}
                        placeholder="Command name/tag"
                      />
                    </DefaultInput>
                    <Tabs defaultValue="message" className="mb-[2rem]">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger className="cursor-pointer" value="message">
                          Message
                        </TabsTrigger>
                        <TabsTrigger className="cursor-pointer" value="embed">
                          Embed
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent className="h-full " value="message">
                        <Textarea
                          value={message}
                          className={`min-h-[200px] ${message && message.length >= 1 ? "border-green-500/20" : "border-red-500/20"}`}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                      </TabsContent>
                      <TabsContent value="embed">
                        <EmbedCreator setState={setEmbed} state={embed} />
                      </TabsContent>
                    </Tabs>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="destructive">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        type="submit"
                        onClick={() => createCommandLogic()}
                      >
                        Save changes
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </DialogOverlay>
            </Dialog>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for a command"
            />
          </div>

          <Accordion type="multiple" className="mt-[2rem]">
            {customCommands
              ?.filter((f) =>
                f.commandName?.toLowerCase().includes(search.toLowerCase())
              )
              .map((ccommand, i) => {
                return (
                  <AccordionItem value={ccommand.id} key={i}>
                    <AccordionTrigger>
                      <div className="flex flex-row items-center justify-start gap-3">
                        {prefix}
                        {ccommand.commandName}
                        <p className="text-xs opacity-20">
                          {new Date(
                            ccommand.created as Date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Button
                        variant={"destructive"}
                        onClick={() =>
                          deleteCommandLogic(
                            ccommand.id,
                            ccommand.commandName as string
                          )
                        }
                      >
                        Delete
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
