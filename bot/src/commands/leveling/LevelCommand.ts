import config from "@/config";
import { defaultEmbeds, Embed } from "@/core/Embed";
import { Command } from "@/core/typings";
import { db } from "@/db";
import { leveling } from "@/db/schema";
import { moduleValid } from "@/modules";
import { getGuildConfig } from "@/utils";
import { permissionWeightToEmoji } from "@/utils/permissions";
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  GuildMember,
  parseEmoji,
  resolveColor,
} from "discord.js";
import { and, eq } from "drizzle-orm";

export default {
  name: "level",
  description: "Leveling manipulation & information.",
  usage: [
    "/level current",
    "/level xp",
    "/level givexp (M)",
    "/level removeexp (M)",
    "/level setxp (A)",
    "/level reset (A)",
  ],
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "current",
      type: ApplicationCommandOptionType.Subcommand,
      description: "View your current level",
    },

    {
      name: "xp",
      type: ApplicationCommandOptionType.Subcommand,
      description: "View the amount of required xp for the next/a level.",
      options: [
        {
          name: "level",
          type: ApplicationCommandOptionType.String,
          description: "The level",
          required: false,
        },
      ],
    },
    {
      name: "givexp",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Add an additional amount of xp to a user.",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
        {
          name: "amount",
          type: ApplicationCommandOptionType.Number,
          description: "The amount of xp.",
          required: true,
        },
      ],
    },
    {
      name: "removexp",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Remove an amount of xp from a user.",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
        {
          name: "amount",
          type: ApplicationCommandOptionType.Number,
          description: "The amount of xp.",
          required: true,
        },
      ],
    },
    {
      name: "set",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Set a users xp/level to a specific amount",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
        {
          name: "type",
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: "Level",
              value: "level",
            },
            {
              name: "Xp",
              value: "xp",
            },
          ],
          description: "The amount of xp/level to be set too.",
          required: true,
        },
        {
          name: "value",
          type: ApplicationCommandOptionType.Number,
          description: "The amount of xp/level to be set too.",
          required: true,
        },
      ],
    },
    {
      name: "reset",
      type: ApplicationCommandOptionType.Subcommand,
      description: "Set a users xp to a specific amount",
      options: [
        {
          name: "user",
          type: ApplicationCommandOptionType.User,
          description: "The user",
          required: true,
        },
        {
          name: "amount",
          type: ApplicationCommandOptionType.Number,
          description: "The amount of xp to be set too.",
          required: true,
        },
      ],
    },
  ],
  run: async ({ ctx, client, args }) => {
    const subCommand = args.getSubcommand(true) as string;
    const guildConfig = await getGuildConfig(ctx.guild?.id as string);
    if (!guildConfig) return;

    if (!guildConfig.leveling)
      return ctx.reply({
        flags: ["Ephemeral"],
        content: `${config.emojis.cross} The leveling module is currently disabled. ${ctx.member.permissions.has("ManageGuild") ? "Turn it on to let members earn XP, level up, and unlock rewards through activity and engagement." : ""}`,
      });

    switch (subCommand.toLowerCase()) {
      case "current":
        const levelingData = await db
          .select()
          .from(leveling)
          .where(
            and(
              eq(leveling.guildId, ctx.guild?.id as string),
              eq(leveling.userId, ctx.member.id)
            )
          );
        if (!levelingData || !levelingData[0])
          return ctx.reply({
            flags: ["Ephemeral"],
            embeds: [
              new Embed({
                color: resolveColor(config.colors.error),
                title: "An Error Occured",
                description:
                  "It appears we have no saved leveling data for you. Please start chatting and check again later.\n\n-# *If this issue persists please report it within my support server.*",
              }),
            ],
          });

        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              author: {
                name: "Current Level",
                iconURL:
                  ctx.member.avatarURL({ extension: "png", size: 64 }) || "",
              },
              description:
                "Leveling lets you earn XP for every message you send, with a random amount added each time. Hit certain levels to unlock rewards and show off your progress. There’s a short 6-second cooldown between messages, so spamming won’t help—just stay active and have fun!",
            
            }),
          ],
        });
        break;
      default:
        return ctx.reply({
          flags: ["Ephemeral"],
          embeds: [
            new Embed({
              color: resolveColor(config.colors.error),
              description: `${config.emojis.cross} Unknown leveling subcommand.`,
            }),
          ],
        });
    }
  },
} as Command;
