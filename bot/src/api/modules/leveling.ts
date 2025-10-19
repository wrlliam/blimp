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
  GuildLevelSelect,
  leveling,
  LevelingSelect,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { app } from "@/index";

export const levelingModule = new Elysia({
  prefix: "/leveling",
}).get(`/:id/leaderboard`, async (context) => {
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
