"use client";

import { fetchRoles } from "@/components/fetchMass";
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
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { env } from "@/env";
import { User } from "@/lib/auth/client";
import { limitSentence } from "@/lib/utils";
import { betterFetch } from "@better-fetch/fetch";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import { Role, Guild } from "discord.js";
import { BookmarkIcon, HeartIcon, StarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PermissionSettings({ user, guild }: {
  guild: Guild | undefined;
  user: User | undefined;
}) {
  const [admins, setAdmins] = useState<string[]>([]);
  const [moderators, setModerators] = useState<string[]>([]);
  const [helpers, setHelpers] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const rolesFn = fetchRoles(guild?.id as string, user as User);

  const { mutateAsync: updatePermissions } = useMutation({
    mutationKey: ["updatePermissions", "dashboard"],
    mutationFn: async (data: {
     type: "ADMINS" | "MODS" | "HELPERS",
     roles: string[]
    }) =>
      betterFetch<{
        data: {
          ok: boolean;
        };
      }>(
        `${env.NEXT_PUBLIC_API_URL}/modules/settings/${guild?.id}/permissions`,
        {
          method: "POST",
          body: data,
          headers: {
            "bearer-user-id": `${user?.user_id}`,
            "bearer-authorization": `${user?.authentication_token}`,
          },
          onSuccess: () => {
            toast.success("Successfully updated permissions.");
          },
          onRequest: () => {
            console.log(`Sending request to /modules/settings/${guild?.id}/permissions`);
          },
          onError: (error: any) => {
            console.error("API request failed:", error);
            toast.error(
              "Failed to update permission data, please refresh to try again."
            );
          },
        }
      ),
  });

  useEffect(() => {
    rolesFn.loadRoles(setLoading, setRoles);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription className="w-[500px]">
          A custom permission system gives you precise control. Set access based
          on roles instead of default permissions, making management simpler,
          smarter, and perfectly tailored to your server.
        </CardDescription>
      </CardHeader>
      {loading ? (
        <CardContent>
          <p className="text-sm opacity-60">Loading....</p>
        </CardContent>
      ) : (
        <CardContent className="flex flex-row gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant={"secondary"}>Edit Administrators</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Administrators</DialogTitle>
                <DialogDescription>
                  Administrator permissions give you full control. Manage every
                  feature, setting, and permission with complete
                  access—nothing’s off-limits when you’re in charge.
                </DialogDescription>
              </DialogHeader>
              <ToggleGroup
                value={admins}
                onValueChange={(v) => setAdmins(v)}
                className="flex flex-wrap items-center justify-center"
                type="multiple"
                variant="outline"
                spacing={2}
                size="sm"
              >
                {roles.map((role) => {
                  return (
                    <ToggleGroupItem
                      key={role.id}
                      aria-label={`Toggle ${role.name}`}
                      className="data-[state=on]:bg-default-accent smooth_transition w-[18%]"
                      value={role.id}
                    >
                      {limitSentence(role.name)}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>

              <DialogFooter className="flex flex-row gap-3">
                <DialogClose asChild>
                  <Button
                    variant={"main"}
                    onClick={() =>
                      updatePermissions({
                        type: "ADMINS",
                        roles: admins,
                      })
                    }
                  >
                    Save Changes
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant={"secondary"}>Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant={"secondary"}>Edit Moderators</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Moderators</DialogTitle>
                <DialogDescription>
                  Moderator permissions offer strong control without full admin
                  access. Handle reports, manage chats, and keep things running
                  smoothly—powerful tools with balanced responsibility.
                </DialogDescription>
              </DialogHeader>
              <ToggleGroup
                value={moderators}
                onValueChange={(v) => setModerators(v)}
                className="flex flex-wrap items-center justify-center"
                type="multiple"
                variant="outline"
                spacing={2}
                size="sm"
              >
                {roles.map((role) => {
                  return (
                    <ToggleGroupItem
                      key={role.id}
                      aria-label={`Toggle ${role.name}`}
                      className="data-[state=on]:bg-default-accent smooth_transition w-[18%]"
                      value={role.id}
                    >
                      {limitSentence(role.name)}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>

              <DialogFooter className="flex flex-row gap-3">
                <DialogClose asChild>
                  <Button
                    variant={"main"}
                    onClick={() =>
                      updatePermissions({
                        type: "MODS",
                        roles: moderators,
                      })
                    }
                  >
                    Save Changes
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant={"secondary"}>Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant={"secondary"}>Edit Helpers</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Helpers</DialogTitle>
                <DialogDescription>
                  Helper permissions are designed for support and order. With
                  limited access, they can guide members, manage minor issues,
                  and keep the community running smoothly.
                </DialogDescription>
              </DialogHeader>
              <ToggleGroup
                value={helpers}
                onValueChange={(v) => setHelpers(v)}
                className="flex flex-wrap items-center justify-center"
                type="multiple"
                variant="outline"
                spacing={2}
                size="sm"
              >
                {roles.map((role) => {
                  return (
                    <ToggleGroupItem
                      key={role.id}
                      aria-label={`Toggle ${role.name}`}
                      className="data-[state=on]:bg-default-accent smooth_transition w-[18%]"
                      value={role.id}
                    >
                      {limitSentence(role.name)}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>

              <DialogFooter className="flex flex-row gap-3">
                <DialogClose asChild>
                  <Button
                    variant={"main"}
                    onClick={() =>
                      updatePermissions({
                        type: "HELPERS",
                        roles: helpers,
                      })
                    }
                  >
                    Save Changes
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant={"secondary"}>Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}
