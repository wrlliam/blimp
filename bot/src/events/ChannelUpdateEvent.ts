import config from "@/config";
import { Event } from "@/core/typings";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { ClientEvents, EmbedBuilder, GuildChannel, TextChannel } from "discord.js";
import { eq } from "drizzle-orm";

export default {
  name: "channelUpdate",
  run: async (oldChannel: GuildChannel, newChannel: GuildChannel) => {
    if (!oldChannel || !newChannel || !newChannel.guild) return;

    const [gConfig] = await db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.id, newChannel.guild.id));
    if (
      !gConfig ||
      !gConfig.logsChannelId ||
      !gConfig.enabledLogs?.includes("messageDelete")
    )
      return;

    const channel = (await newChannel.guild.channels.fetch(
      gConfig.logsChannelId
    )) as TextChannel;
    if (!channel) return;

    //?todo: different checks, e.g permission update etc
    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Channel Updated",
      })
      .setColor(config.colors.error)
      .setDescription(
        `Channel name: ${oldChannel.name} -> ${newChannel.name}`
      )
      .setTimestamp()
      .setFooter({
        text: `Channe; ID: ${newChannel.id}`,
      });

    await channel.send({ embeds: [embed] });
  },
} as Event<"channelUpdate">;