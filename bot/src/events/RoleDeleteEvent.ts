import { ActivityType, Guild, Role, type ClientEvents } from "discord.js";
import type { Event } from "../core/typings";
import { db } from "@/db";
import { guildLevel } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { err } from "@/utils";

export default {
  name: "roleDelete",
  run: async (role: Role) => {
    const guildLevelData = await db
      .select()
      .from(guildLevel)
      .where(
        and(
          eq(guildLevel.guildId, role.guild.id),
          eq(guildLevel.roleId, role.id)
        )
      );

    if (guildLevelData && guildLevelData[0]) {
      await db
        .delete(guildLevel)
        .where(
          and(
            eq(guildLevel.guildId, role.guild.id),
            eq(guildLevel.roleId, role.id)
          )
        )
        .catch(() =>
          err(
            `Failed to delete guild level data, due to role delete ${role.name} (${role.id}) in ${role.guild.name} (${role.guild.id})`
          )
        );
    }
  },
} as Event<"roleDelete">;
