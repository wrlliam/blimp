"use client";

import GuildNavigationBar from "@/components/dashboard/GuildNavigationBar";
import GuildSidebar from "@/components/dashboard/GuildSidebar";
import Loader from "@/components/loader";
import { toast } from "@/components/Toast";
import { env } from "@/env";
import { authClient } from "@/lib/auth/client";
import { useGuildStore, useUserStore } from "@/lib/stores";
import { betterFetch } from "@better-fetch/fetch";
import { Guild } from "discord.js";
import { useParams } from "next/navigation";
import React, { useState } from "react";

export default function DashboardLayout(props: {
  children: React.ReactNode | React.ReactElement;
}) {
  const { guild, setGuild } = useGuildStore((s) => s);
  const { user, session } = useUserStore();
  const { data } = authClient.useSession();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(guild ? false : true);
  const displayUser = user || (session?.user ? session.user : null);

  React.useEffect(() => {
    if (!guild && session && user && user.id) {
      betterFetch<{
        ok: boolean;
        data: Guild | null;
      }>(`${env.NEXT_PUBLIC_API_URL}/dash/guild/${id}`, {
        headers: {
          "bearer-user-id": `${user.user_id}`,
          "bearer-authorization": `${user.authentication_token}`,
        },
      })
        .then((data) => {
          if (data && data.data && data.data.ok) {
            setGuild(data.data?.data);
            setLoading(false);
          } else {
            toast({
              icon: "error",
              title: "An unexpected error occured.",
              description:
                "It seems we were unable to find this guild! Please refresh to try again.",
            });
          }
        })
        .catch(() => {
          toast({
            icon: "error",
            title: "An unexpected error occured.",
            description:
              "It seems we were unable to find this guild. Please refresh to try again.",
          });
        });
    } else {
      setLoading(true);
    }
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <GuildSidebar guild={guild as Guild} />
      <div className="flex flex-col w-full h-full">
        <GuildNavigationBar full={false} />
        <div className="flex-1 overflow-y-auto px-3 pb-16 pt-4">
          {props.children}
        </div>
      </div>
    </div>
  );
}
