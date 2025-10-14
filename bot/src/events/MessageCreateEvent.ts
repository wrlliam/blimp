import type { ClientEvents, Message, TextChannel } from "discord.js";
import type { Event } from "../core/typings";
import { app } from "..";
import {
  customCommand,
  guildConfig,
  messages,
} from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { err, info } from "../utils/logger";

export default {
  name: "messageCreate",
  run: async (message: Message) => {
    if (message.guild) {
      const data = await db
        .select()
        .from(guildConfig)
        .where(eq(guildConfig.id, message.guild.id));
      if (!data || !data[0]) {
        await db
          .insert(guildConfig)
          .values({
            id: message.guild.id,
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
          
        if (commandData && commandData[0]) {
          return (message.channel as TextChannel).send(
            JSON.parse(commandData[0].commandBody as string)
          );
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
