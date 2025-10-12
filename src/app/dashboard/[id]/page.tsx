"use client";

import GuildSidebar from "@/components/dashboard/GuildSidebar";
import EmbedCreator from "@/components/EmbedCreator";
import { useGuildStore } from "@/lib/stores";
import { APIEmbed } from "discord.js";
import { useState } from "react";

export default function DashboardPage() {
  const [embed, setEmbed] = useState<APIEmbed | undefined>()
  return <div className="flex w-full">
    <EmbedCreator state={embed} setState={setEmbed}/>
    {JSON.stringify(embed)}
  </div>;
}
