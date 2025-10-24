import { Event } from "@/core/typings";
import { db } from "@/db";
import { guildConfig, messageAndEmbeds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { EmbedBuilder, Events, Message, TextChannel } from "discord.js";
import config from "@/config";
import { err } from "@/utils";

export default {
  name: Events.MessageDelete,
  run: async (message: Message) => {
    if (message && message.guild && message.author?.bot) {
      const isDashboardMessage = await db
        .select()
        .from(messageAndEmbeds)
        .where(
          and(
            eq(messageAndEmbeds.guildId, message.guild.id),
            eq(messageAndEmbeds.id, message.id),
            eq(messageAndEmbeds.channelId, message.channel.id)
          )
        );

      if (isDashboardMessage && isDashboardMessage.length > 0) {
        await db
          .delete(messageAndEmbeds)
          .where(eq(messageAndEmbeds.id, isDashboardMessage[0].id))
          .execute()
          .catch(() =>
            err(
              `Failed to remove dashboard message ${message.id} (${message.guild?.name} - ${message.guild?.id})`
            )
          );
      }
    }
    if (!message.guild || !message.author || message.author.bot) return;

    const [gConfig] = await db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.id, message.guild.id));
    if (
      !gConfig ||
      !gConfig.logsChannelId ||
      !gConfig.enabledLogs?.includes("messageDelete")
    )
      return;

    const channel = (await message.guild.channels.fetch(
      gConfig.logsChannelId
    )) as TextChannel;
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: "Message Deleted",
        iconURL: message.author.displayAvatarURL(),
      })
      .setColor(config.colors.error)
      .setDescription(
        `Message sent by ${message.author} deleted in ${message.channel}`
      )
      .addFields({ name: "Content", value: message.content || "No content" })
      .setTimestamp()
      .setFooter({
        text: `User ID: ${message.author.id} | Message ID: ${message.id}`,
      });

    await channel.send({ embeds: [embed] });
  },
} as Event<"messageDelete">;
