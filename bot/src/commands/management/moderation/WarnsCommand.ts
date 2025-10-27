import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  EmbedBuilder,
  Guild,
} from "discord.js";
import type { Command } from "@/core/typings";
import { getCommand, limitSentence, paginate } from "@/utils/misc";
import { db } from "@/db";
import { infraction } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { warn } from "console";
import { Embed } from "@/core/Embed";
import config from "@/config";

export default {
  name: "warns",
  description: "List a users warns.",
  usage: ["/warns [user] [reason]"],
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: ["KickMembers"],
  options: [
    {
      name: "target",
      type: ApplicationCommandOptionType.User,
      description: "the user to warn",
      required: true,
    },
  ],
  run: async ({ ctx, client, args }) => {
    const user = args.getUser("target", true);
    const warns = await db
      .select()
      .from(infraction)
      .where(
        and(
          eq(infraction.guildId, ctx.guild?.id as string),
          eq(infraction.userId, user.id),
          eq(infraction.type, "warn")
        )
      );
    if (!warns || !warns[0])
      return ctx.reply({
        flags: ["Ephemeral"],
        embeds: [
          new Embed({
            author: {
              iconURL: ctx.user.avatarURL({
                extension: "png",
                size: 128,
              }) as string,
              name: `No Warnings`,
            },
            description: `It appears <@${user.id}> has no existing warnings.`,
          }),
        ],
      });

    const embeds: Embed[] = [];

    for (
      let i = 0;
      i < (warns.length >= 5 ? warns.length / 5 : warns.length);
      i++
    ) {
      const warningsInScope = warns.splice(0, 5);
      embeds.push(
        new Embed({
          author: {
            iconURL: ctx.user.avatarURL({
              extension: "png",
              size: 128,
            }) as string,
            name: `${user.username}'s Warnings`,
          },
          description: `${warningsInScope
            .map(
              (warn, i) =>
                `**${warn.id}**\n${limitSentence(warn.reason, 36)} - ${
                  config.emojis.mod
                } <@${warn.moderatorId}>`
            )
            .join("\n\n")}`,
        })
      );
    }

    await paginate(ctx, { embeds });
  },
} as Command;
