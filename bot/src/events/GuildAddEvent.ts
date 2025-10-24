import {
  ChannelType,
  TextChannel,
  TextThreadChannel,
  type ClientEvents,
  type Guild,
  type Message,
} from "discord.js";
import type { Event } from "../core/typings";
import { app } from "..";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { err, info } from "../utils/logger";
import { generateBoilerPlateLevels } from "@/modules/leveling";
import config from "@/config";
import { Embed } from "@/core/Embed";

export default {
  name: "guildCreate",
  run: async (guild: Guild) => {
    // shouldnt have record but just incase
    const data = await db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.id, guild.id));

    generateBoilerPlateLevels(guild); // Just incase they toggle it later, saves compute / doesnt add any unnecessary latency.

    if (!data || !data[0]) {
      await db
        .insert(guildConfig)
        .values({
          id: guild.id,
          permAdministrators: guild.roles.cache
            .filter((f) => f.permissions.has("Administrator"))
            .map((z) => z.id),
          permModerators: guild.roles.cache
            .filter((f) => f.permissions.has("BanMembers"))
            .map((z) => z.id),
          permHelpers: guild.roles.cache
            .filter((f) => f.permissions.has("ManageMessages"))
            .map((z) => z.id),
        })
        .execute()
        .then((d) => {
          info(`Joined guild: ${guild.name} (${guild.id})`);
        })
        .catch((e) =>
          err(
            `Failed to create guild config on join: ${guild?.name} (${guild?.id})`
          )
        );
    }

    const typeableChannels = guild.channels.cache.filter(
      (f) => f.type === ChannelType.GuildText && f.isSendable()
    );


    if (typeableChannels && typeableChannels.first()) {
      (typeableChannels.first() as TextChannel)
        .send({
          embeds: [
            new Embed({
              footer: undefined,
              author: {
                name: "Thank you for choosing Blimp!",
                iconURL: app.user?.avatarURL({
                  extension: "png",
                  size: 128,
                }) as string,
              },
              description:
                "Blimp is a powerful yet simple Discord bot with moderation, filtering, leveling, and more—all managed through a secure web dashboard at https://blimp.digital. You’re in control, and we only ask for what’s necessary to get you started.\n\n-# *Note: Blimp is currently in early beta, so features may evolve as we improve the service.*",
            }),
          ],
        })
        .catch(() =>
          err(`Failed to send welcome message in ${guild.name} (${guild.id})`)
        );
    }
  },
} as Event<keyof ClientEvents>;
