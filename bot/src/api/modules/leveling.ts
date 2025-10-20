import Elysia from "elysia";
import {
  AuthenticatedContext,
  createAuthMiddleware,
  createErrorResponse,
  createSuccessResponse,
} from "../dash";
import { db } from "@/db";
import {
  guildLevel,
  guildLevelMultiplier,
  GuildLevelSelect,
  leveling,
  LevelingSelect,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { app } from "@/index";
import { getGuildConfig } from "@/utils";
import { Role } from "discord.js";

export const levelingModule = new Elysia({
  prefix: "/leveling",
})
  .get(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const data = {};

      const guildConfig = await getGuildConfig(auth.guild.id);
      if (!guildConfig)
        return createErrorResponse("Failed to find guild configuration.");

      const levels = await db
        .select()
        .from(guildLevel)
        .where(eq(guildLevel.guildId, auth.guild.id));

      if (!levels || !levels[0])
        return createErrorResponse("Failed to find levels data.");

      const multipliers = await db
        .select()
        .from(guildLevelMultiplier)
        .where(eq(guildLevelMultiplier.guildId, auth.guild.id));

    

      const levelsWithRoles: (GuildLevelSelect & { role: Role | null})[] = [];
      for(let i = 0; i < levels.length; i++) {
        const level = levels[i]
        const role = auth.guild.roles.cache.find(f => f.id === level.roleId);
        levelsWithRoles.push({
          ...level,
          role: role || null
        })
      }

      return createSuccessResponse({
        ok: true,
        data: {
          toggled: guildConfig.leveling,
          levels: levelsWithRoles,
          multipliers: multipliers && multipliers[0] ? multipliers : []
        },
      });
    } catch (e) {
      return createErrorResponse("Unable to find leveling data.");
    }
  })
  .get(`/:id/leaderboard`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const levelingData = await db
        .select()
        .from(leveling)
        .where(and(eq(leveling.guildId, auth.guild.id)));

      let data: (
        | (LevelingSelect & { level: GuildLevelSelect })
        | LevelingSelect
      )[] = [];

      for (let i = 0; i < levelingData.length; i++) {
        const level = levelingData[i] as LevelingSelect;
        const newLevel = {
          ...level,
          user: auth.guild.members.cache.find((f) => f.id === level.userId),
        };

        if (newLevel.levelId) {
          const levelData = await db
            .select()
            .from(guildLevel)
            .where(eq(guildLevel.id, newLevel.levelId));
          if (levelData && levelData[0]) {
            data.push({
              ...newLevel,
              level: levelData[0],
            });
          } else {
            data.push(newLevel);
          }
        } else {
          data.push(newLevel);
        }
      }

      return createSuccessResponse({
        ok: true,
        data: data.sort((a, b) => b.xp - a.xp),
      });
    } catch (e) {
      return createErrorResponse(
        "Unable to find leveling leaderboard statisitcs."
      );
    }
  });
