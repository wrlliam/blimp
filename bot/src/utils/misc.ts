import { defaultEmbeds, Embed } from "@/core/Embed";
import { app } from "..";
import { db } from "@/db";
import {
  guildConfig,
  guildLevel,
  GuildLevelSelect,
  leveling,
  LevelingSelect,
} from "@/db/schema";
import {
  ActionRowBuilder,
  APIEmbed,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  Guild,
  GuildMember,
  InteractionResponse,
  Message,
  PermissionsBitField,
  Sticker,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ExtendedInteraction } from "@/core/typings";
import config from "@/config";
import { err } from "./logger";

export function createId(length: number = 35) {
  let str = "QWERTYUIOASDFGHJKLZXCVBNMqwertyuioasdfghjklzxcvbnm1234567890---";
  let chars = "";
  for (let i = 0; i < length; i++) {
    chars += str[Math.floor(Math.random() * str.length)];
  }
  return chars;
}

export function updateDisabledCommands(
  currentDisabled: string[],
  enableList: string[],
  disableList: string[]
): string[] {
  const disabledSet = new Set(currentDisabled);

  for (const cmd of enableList) {
    if (disabledSet.has(cmd)) {
      disabledSet.delete(cmd);
    }
  }

  for (const cmd of disableList) {
    if (!disabledSet.has(cmd)) {
      disabledSet.add(cmd);
    }
  }

  return Array.from(disabledSet);
}

export async function getGuildConfig(id: string) {
  let d = await db.select().from(guildConfig).where(eq(guildConfig.id, id));
  if (!d || !d[0]) {
    await db
      .insert(guildConfig)
      .values({
        id: id,
      })
      .execute();

    d = await db.select().from(guildConfig).where(eq(guildConfig.id, id));
  }
  return d || d[0] ? d[0] : null;
}

export async function disabledCommand(name: string, guildId: string) {
  const config = await getGuildConfig(guildId);
  if (!config) return false;

  return config.disabledCommands.includes(name.toLowerCase());
}

export function getCommand(name: string) {
  return app.commands.get(name.toLowerCase());
}

//TODO! We need to fix this...

export function formatNonCyclicGuildData(guild: Guild): Object {
  const formattedGuild = guild.toJSON();
  //@ts-ignore
  delete formattedGuild.members;
  return formattedGuild as Object;
}

export type MessagePayloadCreationData = {
  content?: string;
  embeds?: (APIEmbed | undefined)[];
};

export const formMessagePayload = (data: MessagePayloadCreationData) => {
  let o = {} as MessagePayloadCreationData;
  if (data.embeds && data.embeds[0] && data.embeds.length > 0) {
    o["embeds"] = data.embeds;
  }

  if (data.content) {
    o["content"] = data.content;
  } else {
    if (!data.content && (!data.embeds || data.embeds.length <= 0)) {
      o["content"] = "Invalid message provided.";
    }
  }

  return o;
};

type VariableResolver = () => string | null | undefined;

export const variableFormat = async (
  content: string,
  guild: Guild | undefined,
  user: GuildMember | undefined
): Promise<string> => {
  const now = new Date();

  const rawLevelingData = await db
    .select()
    .from(leveling)
    .where(
      and(
        eq(leveling.guildId, guild?.id as string),
        eq(leveling.userId, user?.id as string)
      )
    );

  // console.log(rawLevelingData)

  const levelingData = async (): Promise<
    LevelingSelect & {
      level: GuildLevelSelect;
    }
  > => {
    const data = (
      rawLevelingData && rawLevelingData[0] ? rawLevelingData[0] : null
    ) as LevelingSelect;
    const rawLevel = await db
      .select()
      .from(guildLevel)
      .where(
        and(
          eq(guildLevel.guildId, guild?.id as string),
          eq(guildLevel.id, data?.levelId as string)
        )
      );

    const level =
      rawLevel && rawLevel[0]
        ? rawLevel[0]
        : ({
            guildId: guild?.id,
            id: "",
            level: 0,
            roleId: "",
            xpRequired: 0,
          } as GuildLevelSelect);

    return {
      ...data,
      level,
    };
  };

  const levelingDataFormat = await levelingData();
  const variables: Record<string, VariableResolver> = {
    "$user.username$": () => user?.user.username,
    "$user.displayname$": () => user?.displayName,
    "$user.nickname$": () => user?.nickname,
    "$user.id$": () => user?.id,
    "$user.tag$": () => user?.user.tag,
    "$user.discriminator$": () => user?.user.discriminator,
    "$user.mention$": () => (user ? `<@${user.id}>` : null),
    "$user.avatar$": () => user?.user.displayAvatarURL(),
    "$user.avatarurl$": () => user?.user.displayAvatarURL(),
    "$user.joindate$": () => user?.joinedAt?.toLocaleDateString(),
    "$user.joined$": () => user?.joinedAt?.toLocaleDateString(),
    "$user.createdate$": () => user?.user.createdAt.toLocaleDateString(),
    "$user.created$": () => user?.user.createdAt.toLocaleDateString(),
    "$user.roles$": () => user?.roles.cache.size.toString(),
    "$user.rolecount$": () => user?.roles.cache.size.toString(),
    "$user.bot$": () => (user?.user.bot ? "Yes" : "No"),

    "$user.level$": () => levelingDataFormat.level.level?.toString(),
    "$user.xp$": () => levelingDataFormat.xp.toString(),

    "$guild.name$": () => guild?.name,
    "$guild.id$": () => guild?.id,
    "$guild.membercount$": () => guild?.memberCount.toString(),
    "$guild.members$": () => guild?.memberCount.toString(),
    "$guild.icon$": () => guild?.iconURL(),
    "$guild.iconurl$": () => guild?.iconURL(),
    "$guild.owner$": () => guild?.ownerId,
    "$guild.ownerid$": () => guild?.ownerId,
    "$guild.createdate$": () => guild?.createdAt.toLocaleDateString(),
    "$guild.created$": () => guild?.createdAt.toLocaleDateString(),
    "$guild.roles$": () => guild?.roles.cache.size.toString(),
    "$guild.rolecount$": () => guild?.roles.cache.size.toString(),
    "$guild.channels$": () => guild?.channels.cache.size.toString(),
    "$guild.channelcount$": () => guild?.channels.cache.size.toString(),
    "$guild.emojis$": () => guild?.emojis.cache.size.toString(),
    "$guild.emojicount$": () => guild?.emojis.cache.size.toString(),
    "$guild.boosts$": () => guild?.premiumSubscriptionCount?.toString() ?? "0",
    "$guild.boostcount$": () =>
      guild?.premiumSubscriptionCount?.toString() ?? "0",
    "$guild.boostlevel$": () => guild?.premiumTier.toString(),
    "$guild.boosttier$": () => guild?.premiumTier.toString(),

    "$time.now$": () => now.toISOString(),
    "$time.iso$": () => now.toISOString(),
    "$time.unix$": () => Math.floor(now.getTime() / 1000).toString(),
    "$time.date$": () => now.toLocaleDateString(),
    "$time.time$": () => now.toLocaleTimeString(),
    "$time.timestamp$": () => now.toLocaleString(),
    "$time.year$": () => now.getFullYear().toString(),
    "$time.month$": () => (now.getMonth() + 1).toString(),
    "$time.day$": () => now.getDate().toString(),
    "$time.hour$": () => now.getHours().toString(),
    "$time.minute$": () => now.getMinutes().toString(),
    "$time.second$": () => now.getSeconds().toString(),
  };

  let result = content;
  for (const [key, resolver] of Object.entries(variables)) {
    if (result.includes(key)) {
      try {
        const value = resolver();
        if (value !== null && value !== undefined) {
          result = result.replaceAll(key, value);
        }
      } catch {}
    }
  }

  return result;
};

export const createCustomVariableFormatter = async (
  customVariables: Record<string, VariableResolver>
) => {
  return async (
    content: string,
    guild: Guild | undefined,
    user: GuildMember | undefined
  ): Promise<string> => {
    let result = await variableFormat(content, guild, user);

    for (const [key, resolver] of Object.entries(customVariables)) {
      if (result.includes(key)) {
        try {
          const value = resolver();
          if (value !== null && value !== undefined) {
            result = result.replaceAll(key, value);
          }
        } catch {}
      }
    }

    return result;
  };
};

export const messagePayloadSchema = z.object({
  content: z.string().optional(),
  embeds: z.any().array().optional(),
});

export const formatVariableBody = async (
  data: string,
  member: GuildMember,
  guild: Guild
) => {
  const body = messagePayloadSchema.parse(JSON.parse(data));

  if (body.content) {
    body["content"] = await variableFormat(body.content, guild, member);
  }

  if (body.embeds && body.embeds.length > 0) {
    const embeds: (APIEmbed | null)[] = [];
    for (let i = 0; i < body.embeds.length; i++) {
      const e = body.embeds[i] as APIEmbed;
      const embed = {
        ...e,
      } as APIEmbed;

      if (embed.description) {
        embed["description"] = await variableFormat(
          embed.description,
          member.guild,
          member
        );
      }

      embeds.push(embed && embed.description && embed.title ? embed : null);
    }

    body["embeds"] = embeds;
  }
  return body;
};

interface PaginationOptions {
  embeds: Embed[];
  time?: number; // Collector timeout in milliseconds (default: 60000)
}

/**
 * Creates an interactive paginated embed message with navigation buttons
 * @param interaction - The command interaction to reply to
 * @param options - Pagination options including embeds array and timeout
 * @returns Promise that resolves when pagination is complete
 */
export async function paginate(
  interaction: ExtendedInteraction,
  options: PaginationOptions
): Promise<void> {
  const { embeds, time = 60000 } = options;

  if (!embeds || embeds.length === 0) {
    await interaction.reply({
      embeds: [defaultEmbeds["unexpected-error"]()],
      flags: ["Ephemeral"],
    });
    return;
  }


  let currentPage = 0;

  const getButtons = (
    disabled: boolean = false
  ): ActionRowBuilder<ButtonBuilder> => {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("start")
        .setEmoji("⏮️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || currentPage === 0),
      new ButtonBuilder()
        .setCustomId("previous")
        .setEmoji("◀️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || currentPage === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || currentPage === embeds.length - 1),
      new ButtonBuilder()
        .setCustomId("end")
        .setEmoji("⏭️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || currentPage === embeds.length - 1)
    );
  };

  const response: Message | InteractionResponse = await interaction.reply({
    embeds: [embeds[currentPage]],
    components: embeds.length > 1 ? [getButtons()] : [],
    flags: ["Ephemeral"],
  });

  if (embeds.length === 1) return;

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time,
  });

  collector.on("collect", async (i: ButtonInteraction) => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({
        content: `${config.emojis.cross} These buttons can only be accessed by the command author.`,
        flags: ["Ephemeral"],
      });
      return;
    }

    switch (i.customId) {
      case "start":
        currentPage = 0;
        break;
      case "previous":
        currentPage = Math.max(0, currentPage - 1);
        break;
      case "next":
        currentPage = Math.min(embeds.length - 1, currentPage + 1);
        break;
      case "end":
        currentPage = embeds.length - 1;
        break;
    }

    await i.update({
      embeds: [embeds[currentPage] as APIEmbed],
      components: [getButtons()],
    });
  });

  collector.on("end", async () => {
    try {
      await response.edit({
        embeds: [embeds[currentPage] as APIEmbed],
        components: [getButtons(true)],
      });
    } catch (error) {
      err(`Failed to remove pagination buttons:\n${error}`);
    }
  });
}

export function limitSentence(str: string, length: number = 25) {
  return str.length > length ? str.slice(0, length) + "..." : str;
}
