"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BookmarkIcon, HeartIcon, StarIcon } from "lucide-react";

import { Guild } from "discord.js";
import PermissionSettings from "./permissions";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { User } from "@/lib/auth/client";

export default function Settings() {
  const { guild } = useGuildStore();
  const { user } = useUserStore();

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription className="w-[500px]">
            General settings give you full control over your server’s details.
            Tweak uncategorized options to fine-tune how everything works — your
            setup, your rules, your way.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm opacity-60">More coming soon...</p>
        </CardContent>
      </Card>
      <PermissionSettings guild={guild as Guild} user={user as User} />
    </div>
  );
}
