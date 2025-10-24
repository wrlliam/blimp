import type {
  APIEmbed,
  ClientEvents,
  GuildMember,
  Message,
  TextChannel,
} from "discord.js";
import type { Event } from "../core/typings";
import { customCommand, guildConfig, messages } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { err, info } from "../utils/logger";
import Leveling, { generateBoilerPlateLevels } from "@/modules/leveling";
import { messagePayloadSchema, variableFormat } from "@/utils";
import { redis } from "@/db/redis";
import config from "@/config";

export default {
  name: "messageCreate",
  run: async (message: Message) => {
    if (message.guild && !message.author.bot) {
      const data = await db
        .select()
        .from(guildConfig)
        .where(eq(guildConfig.id, message.guild.id));
      if (!data || !data[0]) {
        await db
          .insert(guildConfig)
          .values({
            id: message.guild.id,
            permAdministrators: message.guild.roles.cache
              .filter((f) => f.permissions.has("Administrator"))
              .map((z) => z.id),
            permModerators: message.guild.roles.cache
              .filter((f) => f.permissions.has("BanMembers"))
              .map((z) => z.id),
            permHelpers: message.guild.roles.cache
              .filter((f) => f.permissions.has("ManageMessages"))
              .map((z) => z.id),
          })
          .execute()
          .then((d) => {
            info(
              `Created guild config on message: ${message.guild?.name} (${message.guild?.id})`
            );
          })
          .catch((e) =>
            err(
              `Failed to create guild config on message: ${message.guild?.name} (${message.guild?.id})`
            )
          );
      }

      const guildConfigData = await db
        .select()
        .from(guildConfig)
        .where(eq(guildConfig.id, message.guild.id));

      if (guildConfigData[0].leveling) {
        const levelingModule = new Leveling();

        if ((await levelingModule.getLevels(message.guild)).length <= 0) {
          generateBoilerPlateLevels(message.guild);
        } else {
          levelingModule.messageLogic(message.member as GuildMember, message);
        }
      }

      if (
        guildConfigData &&
        guildConfigData[0] &&
        message.content
          .toLowerCase()
          .startsWith(guildConfigData[0].customCommandPrefix as string)
      ) {
        const prefix = guildConfigData[0].customCommandPrefix as string;

        const [commandName, ...args] = message.content
          .slice(prefix.length)
          .split(" ");

        const commandData = await db
          .select()
          .from(customCommand)
          .where(eq(customCommand.commandName, commandName.toLowerCase()));

        let previousCommandTimeout = await redis.get(
          `${message.guild.id}-${message.author.id}-custom-commands`
        );
        if (
          !previousCommandTimeout ||
          isNaN(parseInt(previousCommandTimeout))
        ) {
          await redis
            .set(
              `${message.guild.id}-${message.author.id}-custom-commands`,
              new Date().getTime().toString()
            )
            .catch((err) =>
              err(
                `Failed to save custom comman timeout data ${message.guild?.name} (${message.guild?.id}) - ${message.author.username} (${message.author.id})`
              )
            );
        }

        previousCommandTimeout = (await redis.get(
          `${message.guild.id}-${message.author.id}-custom-commands`
        )) as string;

        const diff = new Date().getTime() - parseInt(previousCommandTimeout);

        if (diff < config.timeout.customCommands) return;

        await redis
          .set(
            `${message.guild.id}-${message.author.id}-custom-commands`,
            new Date().getTime().toString()
          )
          .catch((err) =>
            err(
              `Failed to save custom comman timeout data ${message.guild?.name} (${message.guild?.id}) - ${message.author.username} (${message.author.id}) [POST RUN]`
            )
          );

        if (commandData && commandData[0]) {
          const body = messagePayloadSchema.parse(
            JSON.parse(commandData[0].commandBody as string)
          );

          if (body.content) {
            body["content"] = await variableFormat(
              body.content,
              message.guild,
              message.member as GuildMember
            );
          }

          if (body.embeds && body.embeds.length > 0) {
            const embeds: APIEmbed[] = [];
            for (let i = 0; i < body.embeds.length; i++) {
              const e = body.embeds[i] as APIEmbed;
              const embed = {
                ...e,
              } as APIEmbed;

              if (embed.description) {
                embed["description"] = await variableFormat(
                  embed.description,
                  message.guild,
                  message.member as GuildMember
                );
              }

              embeds.push(embed);
            }

            body["embeds"] = embeds;
          }

          return (message.channel as TextChannel).send(body);
        }
      }

      await db
        .insert(messages)
        .values({
          userId: message.author.id,
          guildId: message.guild.id,
          id: message.id,
          bot: message.author.bot,
        })
        .execute();
    }
  },
} as Event<keyof ClientEvents>;
