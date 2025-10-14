import Elysia from "elysia";
import {
  AuthenticatedContext,
  createAuthMiddleware,
  createErrorResponse,
  createSuccessResponse,
} from "../dash";
import { db } from "@/db";
import { customCommand, guildConfig, messages } from "@/db/schema";
import { and, eq, gte, isNotNull, ne, desc } from "drizzle-orm";
import { createId, getGuildConfig } from "@/utils";
import { z } from "zod";

const welcomeMessageUpdate = z.object({
  active: z.boolean().optional(),
  data: z.string().optional(),
});

export const welcomeAndGoodbyeModule = new Elysia({
  prefix: "/welcome-and-goodbye",
})
  .get(`/:id/welcome`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;
      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const guildConfig = await getGuildConfig(auth.guild.id);

      if (!guildConfig) {
        return createErrorResponse(
          "Failed to fetch welcome data, please try again."
        );
      } else {
        return createSuccessResponse({
          ok: true,
          data: {
            welcomeMessage: guildConfig.welcomeMessage,
            welcomeMessageData: guildConfig.welcomeMessageData,
          },
        });
      }
    } catch (e) {
      return createErrorResponse(
        "Failed to fetch welcome data, please try again."
      );
    }
  })
  .post(`/:id/welcome`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;
      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const body = welcomeMessageUpdate.parse(context.body);

      const guildConfigExisting = await getGuildConfig(auth.guild.id);

      if (!guildConfigExisting) {
        return createErrorResponse(
          "Failed to fetch welcome data, please try again."
        );
      } else {
        return await db
          .update(guildConfig)
          .set({
            welcomeMessage: body.active
              ? body.active
              : guildConfigExisting.welcomeMessage,
            welcomeMessageData: body.data
              ? body.data
              : guildConfigExisting.welcomeMessageData,
          })
          .where(eq(guildConfig.id, guildConfigExisting.id))
          .catch(() => {
            return createErrorResponse(
              "Failed to update welcome data, please try again."
            );
          })
          .then(() => {
            return createSuccessResponse({
              ok: true,
              data: {
                welcomeMessage: body.active,
                welcomeMessageData: body.data,
              },
            });
          });
      }
    } catch (e) {
      return createErrorResponse(
        "Failed to update welcome data, please try again."
      );
    }
  });
