"use client";

import { fetchRoles } from "@/components/fetchMass";
import DefaultInput from "@/components/Input";
import Loader from "@/components/loader";
import MessageInput from "@/components/MessageInput";
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { env } from "@/env";
import { User } from "@/lib/auth/client";
import {
  GuildLevelInsert,
  GuildLevelMultiSelect,
  GuildLevelSelect,
  LevelingSelect,
} from "@/lib/db/difference";
import { useGuildStore, useUserStore } from "@/lib/stores";
import {
  discordColorToHex,
  formMessagePayload,
  resolveColor,
  tw,
} from "@/lib/utils";
import { betterFetch } from "@better-fetch/fetch";
import { useMutation } from "@tanstack/react-query";
import { set } from "date-fns";
import { Guild, GuildMember, Role, APIEmbed } from "discord.js";
import { Badge, PlusIcon, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type PassedDownProps = {
  guild: Guild | null;
  user: User | null;
};

const wait = () => new Promise((resolve) => setTimeout(resolve, 1000));

export default function Leveling() {
  const { user } = useUserStore();
  const { guild } = useGuildStore();

  return (
    <div className="flex flex-row gap-3 w-full">
      <LevelingConfig guild={guild} user={user} />
    </div>
  );
}

function LevelingConfig({ user, guild }: PassedDownProps) {
  const [toggle, setToggle] = useState(false);
  const [loading, setLoading] = useState(true);

  const [levels, setLevels] = useState<
    (GuildLevelSelect & { role: Role | null })[]
  >([]);
  const [message, setMessage] = useState("");
  const [embed, setEmbed] = useState<APIEmbed | undefined>();
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState("");
  const [multipliers, setMultipliers] = useState<GuildLevelMultiSelect[]>([]);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);

  const [createdRole, setCreatedRole] = useState<
    Partial<GuildLevelInsert | Record<string, null | undefined | any>>
  >({
    roleId: "",
    level: 0,
    xpRequired: 0,
  });

  const [editedLevel, setEditedLevel] = useState<
    Partial<GuildLevelInsert | Record<string, null | undefined | any>>
  >({
    roleId: "",
    level: 0,
    xpRequired: 0,
  });

  const rolesFn = fetchRoles(guild?.id as string, user as User);

  const { mutateAsync: updateLevelingAsync } = useMutation({
    mutationKey: ["updateLevelData", "dashboard"],
    mutationFn: async (
      data: Partial<{
        leveling: boolean;
        levelingMessage: string;
      }>
    ) =>
      betterFetch<{
        data: {
          ok: boolean;
        };
      }>(`${env.NEXT_PUBLIC_API_URL}/modules/leveling/${guild?.id}/`, {
        method: "POST",
        body: data,
        headers: {
          "bearer-user-id": `${user?.user_id}`,
          "bearer-authorization": `${user?.authentication_token}`,
        },
        onSuccess: () => {
          toast.success(
            "Successfully updated leveling data. Refreshing data..."
          );
          setTimeout(() => {
            window.location.href = window.location.href;
          }, 500);
        },
        onRequest: () => {
          console.log(`Sending request to /modules/leveling/${guild?.id}/`);
        },
        onError: (error: any) => {
          console.error("API request failed:", error);
          toast.error(
            "Failed to fetch leveling data, please refresh to try again."
          );
        },
      }),
  });

  const { mutateAsync: deleteLevelingAsync } = useMutation({
    mutationKey: ["deleteLevelData", "dashboard"],
    mutationFn: async (data: { levelId: string; deleteRole: boolean }) =>
      betterFetch<{
        data: {
          ok: boolean;
        };
      }>(`${env.NEXT_PUBLIC_API_URL}/modules/leveling/${guild?.id}/`, {
        method: "DELETE",
        body: data,
        headers: {
          "bearer-user-id": `${user?.user_id}`,
          "bearer-authorization": `${user?.authentication_token}`,
        },
        onSuccess: () => {
          toast.success("Successfully delete level role");
          setTimeout(() => {
            window.location.href = window.location.href;
          }, 500);
        },
        onRequest: () => {
          console.log(`Sending request to /modules/leveling/${guild?.id}/`);
        },
        onError: (error: any) => {
          console.error("API request failed:", error);
          toast.error(
            "Failed to fetch leveling data, please refresh to try again."
          );
        },
      }),
  });

  const { mutateAsync: fetchLevelingAsync } = useMutation({
    mutationKey: ["fetchLevelData", "dashboard"],
    mutationFn: async () =>
      betterFetch<{
        data: {
          ok: boolean;
          data: {
            toggled: boolean;
            message: string;
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
          console.log(`Sending request to /modules/leveling/${guild?.id}/`);
        },
        onError: (error: any) => {
          console.error("API request failed:", error);
          toast.error(
            "Failed to fetch leveling data, please refresh to try again."
          );
        },
      }),
  });

  const { mutateAsync: createLevelLevelingAsync } = useMutation({
    mutationKey: ["createLevelData", "dashboard"],
    mutationFn: async (data: {
      level: number;
      requiredXp: number;
      roleId: string;
    }) =>
      betterFetch<{
        data: {
          ok: boolean;
        };
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/leveling/${guild?.id}/create-level`,
        {
          method: "POST",
          body: data,
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },

          onRequest: () => {
            console.log(`Sending request to /modules/leveling/${guild?.id}/`);
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch leveling data, please refresh to try again."
            );
          },
        }
      ),
  });

  const { mutateAsync: updateLevelData } = useMutation({
    mutationKey: ["updateLevelData", "dashboard"],
    mutationFn: async (data: {
      levelId: string;
      data: Partial<GuildLevelInsert>;
    }) =>
      betterFetch<{
        data: {
          ok: boolean;
        };
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/leveling/${guild?.id}/edit-level`,
        {
          method: "POST",
          body: data,
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },

          onRequest: () => {
            console.log(`Sending request to /modules/leveling/${guild?.id}/`);
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to fetch leveling data, please refresh to try again."
            );
          },
        }
      ),
  });

  useEffect(() => {
    (async () => {
      const data = await fetchLevelingAsync();
      rolesFn.loadRoles(setLoading, setRoles);
      if (data && data.data) {
        setLoading(false);

        const body = formMessagePayload(
          JSON.parse(data.data.data.data.message)
        );
        // So many datas....
        setToggle(data.data.data.data.toggled);
        setLevels(data.data.data.data.levels);
        setMultipliers(data.data.data.data.multipliers);

        if (body.content) {
          setMessage(body.content);
        }

        if (body.embeds && body.embeds[0]) {
          setEmbed(body.embeds[0]);
        }
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full">
      <Card className="flex w-full">
        <CardHeader>
          <CardTitle>Leveling Configuration</CardTitle>
          <CardDescription className="max-w-[500px]">
            Leveling keeps your community active and engaged. Members earn XP by
            chatting, climbing ranks, and unlocking roles—it’s a fun way to
            reward participation and build interaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DefaultInput
            className="flex flex-row gap-4 items-center"
            title="Enabled?"
          >
            <Switch
              checked={toggle}
              onCheckedChange={() => setToggle(!toggle)}
              className="cursor-pointer"
            />
          </DefaultInput>
          <DefaultInput className="mt-[2rem]" title="Level Up Message">
            <MessageInput
              setEmbed={setEmbed}
              embed={embed}
              setMessage={setMessage}
              message={message}
            />
          </DefaultInput>
          <Button
            onClick={() =>
              updateLevelingAsync({
                leveling: toggle,
                levelingMessage: JSON.stringify(
                  formMessagePayload({
                    content: message,
                    embeds: [embed],
                  })
                ),
              })
            }
            variant={"main"}
            className="w-full mt-[1.25rem]"
          >
            Save Changes
          </Button>
        </CardContent>
      </Card>
      <Card className="flex w-full">
        <CardHeader>
          <CardTitle>Levels</CardTitle>
          <CardDescription className="max-w-[500px]">
            Level reward roles let you recognize active members automatically.
            Set specific roles for each level, and watch your community stay
            motivated as they level up and earn new perks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog
            open={createRoleOpen}
            onOpenChange={(v) => setCreateRoleOpen(v)}
          >
            <DialogTrigger asChild>
              <Button className="w-full mb-[1.5rem]" variant={"secondary"}>
                Add Level
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Level</DialogTitle>
                <DialogDescription>
                  Level roles let members show off their progress and status. As
                  they level up, they can display their achievements with
                  special roles—adding personality and pride to your community.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-row gap-3">
                <DefaultInput title="Role">
                  <Select
                    value={createdRole.roleId as string}
                    onValueChange={(e) => {
                      setCreatedRole({
                        ...createdRole,
                        roleId: e,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role, i) => {
                        return (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </DefaultInput>
                <DefaultInput title="Level" className="w-full">
                  <Input
                    value={createdRole.level.toString()}
                    onChange={(e) => {
                      setCreatedRole({
                        ...createdRole,
                        level: parseInt(e.target.value),
                      });
                    }}
                    type="number"
                  />
                </DefaultInput>
              </div>
              <DefaultInput title="Required XP">
                <Input
                  value={createdRole.xpRequired.toString()}
                  onChange={(e) => {
                    setCreatedRole({
                      ...createdRole,
                      xpRequired: parseInt(e.target.value),
                    });
                  }}
                  type="number"
                />
              </DefaultInput>

              <div className="flex flex-row gap-3">
                <Button
                  variant={"main"}
                  onClick={() => {
                    if (
                      !createdRole ||
                      !createdRole.level ||
                      !createdRole.xpRequired ||
                      !createdRole.roleId
                    ) {
                      return toast.error(
                        "Please provide all required level fields."
                      );
                    }

                    if (levels.find((f) => f.level === createdRole.level)) {
                      return toast.error(
                        `You already have a level for ${createdRole.level}, please pick another value.`
                      );
                    }

                    if (levels.find((f) => f.roleId === createdRole.roleId)) {
                      toast.info(
                        `You already have a level that links to the ${roles.find((f) => f.id === createdRole.id)?.name}. This will result in the member obtaining multiple roles.`
                      );
                    }

                    createLevelLevelingAsync({
                      level: createdRole.level as number,
                      requiredXp: createdRole.xpRequired as number,
                      roleId: createdRole.roleId as string,
                    }).then(() => {
                      wait().then(() => {
                        setCreateRoleOpen(false);
                        setTimeout(() => {
                          window.location.href = window.location.href;
                        }, 1000);
                      });
                    });
                  }}
                >
                  Save Changes
                </Button>
                <DialogClose asChild>
                  <Button onClick={() => {}} variant={"destructive"}>
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-col gap-2">
            {levels.length > 0 ? (
              levels
                .sort((a, b) => a.level - b.level)
                .map((level, i) => {
                  return (
                    <div key={i} className="flex flex-row justify-between">
                      <div className="flex flex-row  items-center gap-3">
                        <div className="bg-input/30 text-xs  px-2 py-1 rounded-md border border-blimp-border">
                          {level.level}
                        </div>
                        <RoleDisplay role={level.role} />
                      </div>
                      <div className="flex flex-row  items-center gap-3">
                        <Dialog
                          open={editRoleOpen}
                          onOpenChange={(v) => {
                            if (v) {
                              setEditedLevel({
                                level: level.level,
                                roleId: level.roleId,
                                xpRequired: level.xpRequired,
                              });
                            }
                            setEditRoleOpen(v);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant={"secondary"}>Edit</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Level</DialogTitle>
                              <DialogDescription>
                                Level roles let members show off their progress
                                and status. As they level up, they can display
                                their achievements with special roles—adding
                                personality and pride to your community.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-row gap-3">
                              <DefaultInput title="Role">
                                <Select
                                  value={editedLevel.roleId as string}
                                  onValueChange={(e) => {
                                    setEditedLevel({
                                      ...editedLevel,
                                      roleId: e,
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {roles.map((role, i) => {
                                      return (
                                        <SelectItem
                                          key={role.id}
                                          value={role.id}
                                        >
                                          {role.name}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </DefaultInput>
                              <DefaultInput title="Level" className="w-full">
                                <Input
                                  value={editedLevel.level.toString()}
                                  onChange={(e) => {
                                    setEditedLevel({
                                      ...editedLevel,
                                      level: parseInt(e.target.value),
                                    });
                                  }}
                                  type="number"
                                />
                              </DefaultInput>
                            </div>
                            <DefaultInput title="Required XP">
                              <Input
                                value={editedLevel.xpRequired.toString()}
                                onChange={(e) => {
                                  setEditedLevel({
                                    ...editedLevel,
                                    xpRequired: parseInt(e.target.value),
                                  });
                                }}
                                type="number"
                              />
                            </DefaultInput>

                            <div className="flex flex-row gap-3">
                              <Button
                                variant={"main"}
                                onClick={() => {
                                  if (
                                    levels.find(
                                      (f) => f.roleId === editedLevel.roleId
                                    )
                                  ) {
                                    toast.info(
                                      `You already have a level that links to the ${roles.find((f) => f.id === editedLevel.id)?.name}. This will result in the member obtaining multiple roles.`
                                    );
                                  }

                                  updateLevelData({
                                    levelId: level.id,
                                    data: {
                                      level: editedLevel.level,
                                      roleId: editedLevel.roleId,
                                      xpRequired: editedLevel.xpRequired,
                                    },
                                  }).then(() => {
                                    wait().then(() => {
                                      setEditRoleOpen(false);
                                      toast.success(
                                        "Successfully updated level, refreshing data..."
                                      );
                                      setTimeout(() => {
                                        window.location.href =
                                          window.location.href;
                                      }, 1000);
                                    });
                                  });
                                }}
                              >
                                Save Changes
                              </Button>
                              <DialogClose asChild>
                                <Button
                                  onClick={() => {}}
                                  variant={"destructive"}
                                >
                                  Cancel
                                </Button>
                              </DialogClose>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant={"destructive"}>
                              <Trash />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <h1 className="mb-3 text-sm opacity-80">
                              Would you like to remove the related role too? (
                              {level.role?.name})
                            </h1>
                            <div className="flex flex-row gap-3">
                              <Button
                                variant={"main"}
                                onClick={() =>
                                  deleteLevelingAsync({
                                    levelId: level.id,
                                    deleteRole: true,
                                  })
                                }
                              >
                                Confirm
                              </Button>
                              <Button
                                variant={"secondary"}
                                onClick={() =>
                                  deleteLevelingAsync({
                                    levelId: level.id,
                                    deleteRole: false,
                                  })
                                }
                              >
                                Decline
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="flex flex-col gap-2 text-xs opacity-50">
                <h1 className="text-sm">
                  Unable to find any created levels...
                </h1>
                <p>
                  TIP: Once leveling is enabled, blimp will automatically create
                  several roles and levels for you.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Multipliers</CardTitle>
          <CardDescription className="w-[500px]">
            Leveling multipliers let you fine-tune XP gains. Boost or reduce
            rewards for specific roles or channels—perfect for balancing
            activity and keeping things fair.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm opacity-60">Coming soon....</p>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleDisplay({ role }: { role: Role | null }) {
  return (
    <div
      style={{
        border: `1px solid ${role?.color ? discordColorToHex(role?.color as number) : "var(--color-bg-input)"}`,
      }}
      className="rounded-lg px-2 text-xs flex justify-center items-center gap-2"
    >
      <div
        style={{
          backgroundColor: `${role?.color ? discordColorToHex(role?.color as number) : "var(--color-bg-input)"}`,
        }}
        className="h-[8px] w-[8px] rounded-full"
      ></div>
      {role?.name}
    </div>
  );
}

type MixedLevelData = LevelingSelect & { user: GuildMember };
type MixedLevelDataArray = (
  | (MixedLevelData & { level: GuildLevelSelect })
  | MixedLevelData
)[];

function LevelingLeaderboard({
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
