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
import { variableFormat } from "@/utils";

const welcomeData = z.object({
  content: z.string().optional(),
  embeds: z.object({}).array().optional(),
});

export default {
  name: Events.GuildMemberAdd,
  run: async (member: GuildMember) => {
    if (member.user.bot) return;

    const [gConfig] = await db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.id, member.guild.id));
    if (
      gConfig &&
      gConfig.logsChannelId &&
      gConfig.enabledLogs?.includes("guildMemberAdd")
    ) {
      const channel = (await member.guild.channels.fetch(
        gConfig.logsChannelId
      )) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Member Joined",
          iconURL: member.user.displayAvatarURL(),
        })
        .setColor(config.colors.success)
        .setDescription(`${member.user} ${member.user.tag}`)
        .addFields({
          name: "Account Created",
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        })
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

      await channel.send({ embeds: [embed] });
    }

    if (gConfig.welcomeMessage && gConfig.welcomeMessageData) {
      const body = welcomeData.parse(JSON.parse(gConfig.welcomeMessageData));

      const channel = member.guild.channels.cache.find(
        (f) => f.id === gConfig.welcomeMessageChannel
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

          if (e.description) {
            e["description"] = variableFormat(
              e.description,
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
} as Event<"guildMemberAdd">;
