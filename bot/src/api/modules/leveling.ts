import Elysia from "elysia";
import {
  AuthenticatedContext,
  createAuthMiddleware,
  createErrorResponse,
  createSuccessResponse,
} from "../dash";
import { db } from "@/db";
import {
  guildConfig,
  guildLevel,
  guildLevelMultiplier,
  GuildLevelSelect,
  leveling,
  LevelingSelect,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { app } from "@/index";
import { createId, err, getGuildConfig } from "@/utils";
import { Role } from "discord.js";
import { z } from "zod";
import { generateBoilerPlateLevels } from "@/modules/leveling";

const deleteBodySchema = z.object({
  levelId: z.string(),
  deleteRole: z.boolean(),
});

const updateBodySchema = z.object({
  leveling: z.boolean(),
  levelingMessage: z.string(),
});

const createLevelBodySchema = z.object({
  level: z.number(),
  requiredXp: z.number(),
  roleId: z.string(),
});

const editLevelBodySchema = z.object({
  levelId: z.string(),
  data: z.object({
    xpRequired: z.number().optional(),
    level: z.number().optional(),
    roleId: z.string().optional(),
  }),
});

export const levelingModule = new Elysia({
  prefix: "/leveling",
})
  .post(`/:id/edit-level`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const body = editLevelBodySchema.parse(context.body);

      const level = await db
        .select()
        .from(guildLevel)
        .where(
          and(
            eq(guildLevel.guildId, auth.guild.id),
            eq(guildLevel.id, body.levelId)
          )
        );
      if (!level || !level[0])
        return createErrorResponse("Unable to find requested level data");

      return await db
        .update(guildLevel)
        .set({
          xpRequired: body.data.xpRequired
            ? body.data.xpRequired
            : level[0].xpRequired,
          roleId: body.data.roleId ? body.data.roleId : level[0].roleId,
          level: body.data.level ? body.data.level : level[0].level,
        })
        .where(
          and(
            eq(guildLevel.guildId, auth.guild.id),
            eq(guildLevel.id, body.levelId)
          )
        )
        .then(() => {
          return createSuccessResponse("Successfully updated level data.");
        })
        .catch(() => {
          return createErrorResponse("Failed to update level data");
        });
    } catch (e) {
      return createErrorResponse("Unable to update level data.");
    }
  })
  .post(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const body = updateBodySchema.parse(context.body);

      if (body.leveling) {
        const levels = await db
          .select()
          .from(guildLevel)
          .where(eq(guildLevel.guildId, auth.guild.id));
        if (levels.length <= 0) {
          try {
            generateBoilerPlateLevels(auth.guild);
          } catch (e) {
            null;
          }
        }
      }

      await db
        .update(guildConfig)
        .set({
          leveling: body.leveling,
          levelingMessage: body.levelingMessage,
        })
        .where(eq(guildConfig.id, auth.guild.id))
        .execute()
        .then(() => {
          return createSuccessResponse("Updated leveling data.");
        })
        .catch(() => {
          return createErrorResponse("Failed to update leveling data.");
        });
    } catch (e) {
      return createErrorResponse("Unable to update leveling data.");
    }
  })
  .post(`/:id/create-level`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const body = createLevelBodySchema.parse(context.body);

      return await db
        .insert(guildLevel)
        .values({
          id: createId(),
          guildId: auth.guild.id,
          level: body.level,
          xpRequired: body.requiredXp,
          roleId: body.roleId,
        })
        .then(() => {
          return createSuccessResponse("Successfully created level data.");
        })
        .catch((e) => {
          return createErrorResponse("Failed to create level data.");
        });
    } catch (e) {
      // console.log(e);
      return createErrorResponse("Unable to create level data.");
    }
  })
  .post(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const body = updateBodySchema.parse(context.body);

      if (body.leveling) {
        const levels = await db
          .select()
          .from(guildLevel)
          .where(eq(guildLevel.guildId, auth.guild.id));
        if (levels.length <= 0) {
          try {
            generateBoilerPlateLevels(auth.guild);
          } catch (e) {
            null;
          }
        }
      }

      await db
        .update(guildConfig)
        .set({
          leveling: body.leveling,
          levelingMessage: body.levelingMessage,
        })
        .where(eq(guildConfig.id, auth.guild.id))
        .execute()
        .then(() => {
          return createSuccessResponse("Updated leveling data.");
        })
        .catch(() => {
          return createErrorResponse("Failed to update leveling data.");
        });
    } catch (e) {
      return createErrorResponse("Unable to update leveling data.");
    }
  })
  .delete(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const body = deleteBodySchema.parse(context.body);

      const guildConfig = await getGuildConfig(auth.guild.id);
      if (!guildConfig)
        return createErrorResponse("Failed to find guild configuration.");

      const levels = await db
        .select()
        .from(guildLevel)
        .where(
          and(
            eq(guildLevel.guildId, auth.guild.id),
            eq(guildLevel.id, body.levelId)
          )
        );

      if (!levels || !levels[0])
        return createErrorResponse("Failed to find levels data.");

      return await db
        .delete(guildLevel)
        .where(
          and(
            eq(guildLevel.guildId, auth.guild.id),
            eq(guildLevel.id, body.levelId)
          )
        )
        .catch(() => {
          return createErrorResponse("Unable to delete leveling data.");
        })
        .then(async () => {
          if (body.deleteRole) {
            const role = auth.guild.roles.cache.find(
              (f) => f.id === levels[0].roleId
            );
            if (role) {
              role
                .delete()
                .catch(() =>
                  err(
                    `Failed to delete leveling role ${role.id} (${auth.guild.name} - ${auth.guild.id})`
                  )
                );
            }
          }

          
          return createSuccessResponse({
            ok: true,
          });
        });
    } catch (e) {
      return createErrorResponse("Unable to delete leveling data.");
    }
  })
  .get(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const guildConfig = await getGuildConfig(auth.guild.id);
      if (!guildConfig)
        return createErrorResponse("Failed to find guild configuration.");

      const rawLevels = await db
        .select()
        .from(guildLevel)
        .where(eq(guildLevel.guildId, auth.guild.id));

      const levels = rawLevels && rawLevels.length > 0 ? rawLevels : [];

      const multipliers = await db
        .select()
        .from(guildLevelMultiplier)
        .where(eq(guildLevelMultiplier.guildId, auth.guild.id));

      const levelsWithRoles: (GuildLevelSelect & { role: Role | null })[] = [];
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const role = auth.guild.roles.cache.find((f) => f.id === level.roleId);
        levelsWithRoles.push({
          ...level,
          role: role || null,
        });
      }

      return createSuccessResponse({
        ok: true,
        data: {
          toggled: guildConfig.leveling,
          message: guildConfig.levelingMessage,
          levels: levelsWithRoles,
          multipliers: multipliers && multipliers[0] ? multipliers : [],
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
