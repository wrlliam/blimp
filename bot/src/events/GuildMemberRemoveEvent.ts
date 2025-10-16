import { Event } from "@/core/typings";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  APIEmbed,
  EmbedBuilder,
  Events,
  GuildMember,
  TextChannel,
} from "discord.js";
import config from "@/config";
import { z } from "zod";
import { messagePayloadSchema, variableFormat } from "@/utils";

const goodbyeData = z.object({
  content: z.string().optional(),
  embeds: z.object({}).array().optional(),
});

export default {
  name: Events.GuildMemberRemove,
  run: async (member: GuildMember) => {
    if (member.user.bot) return;

    const [gConfig] = await db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.id, member.guild.id));
    if (
      gConfig &&
      gConfig.logsChannelId &&
      gConfig.enabledLogs?.includes("guildMemberRemove")
    ) {
      const channel = (await member.guild.channels.fetch(
        gConfig.logsChannelId
      )) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Member Left",
          iconURL: member.user.displayAvatarURL(),
        })
        .setColor(config.colors.error)
        .setDescription(`${member.user} ${member.user.tag}`)
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

      await channel.send({ embeds: [embed] });
    }
    if (gConfig.goodbyeMessage && gConfig.goodbyeMessageData) {
      const body = messagePayloadSchema.parse(JSON.parse(gConfig.goodbyeMessageData));

      const channel = member.guild.channels.cache.find(
        (f) => f.id === gConfig.goodbyeMessageChannel
      ) as TextChannel;

      if (!channel) return;

      if (body.content) {
        body["content"] = variableFormat(body.content, member.guild, member);
      }

      if (body.embeds && body.embeds.length > 0) {
        const embeds: APIEmbed[] = [];
        for (let i = 0; i < body.embeds.length; i++) {
          const e = body.embeds[i] as APIEmbed;
          const embed = {
            ...e,
          } as APIEmbed;

          if (embed.description) {
            embed["description"] = variableFormat(
              embed.description,
              member.guild,
              member
            );
          }
          embeds.push(embed);
        }

        body["embeds"] = embeds;
      }
      channel.send(body);
    }
  },
} as Event<"guildMemberRemove">;
