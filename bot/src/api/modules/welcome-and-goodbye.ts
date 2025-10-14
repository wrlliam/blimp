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
  welcomeMessage: z.boolean().optional(),
  welcomeMessageData: z.string().optional(),
  welcomeMessageChannel: z.string().optional(),
});

const goodbyeMessageUpdate = z.object({
  goodbyeMessage: z.boolean().optional(),
  goodbyeMessageData: z.string().optional(),
  goodbyeMessageChannel: z.string().optional(),
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
            welcomeMessageChannel: guildConfig.welcomeMessageChannel,
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
            welcomeMessage:
              typeof body.welcomeMessage !== "boolean"
                ? false
                : body.welcomeMessage,
            welcomeMessageData: body.welcomeMessageData
              ? body.welcomeMessageData
              : guildConfigExisting.welcomeMessageData,
            welcomeMessageChannel: body.welcomeMessageChannel
              ? body.welcomeMessageChannel
              : guildConfigExisting.welcomeMessageChannel,
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
                welcomeMessage: body.welcomeMessage,
                welcomeMessageData: body.welcomeMessageData,
                welcomeMessageChannel: body.welcomeMessageChannel,
              },
            });
          });
      }
    } catch (e) {
      return createErrorResponse(
        "Failed to update welcome data, please try again."
      );
    }
  })
  .get(`/:id/goodbye`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;
      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const guildConfig = await getGuildConfig(auth.guild.id);
      if (!guildConfig) {
        return createErrorResponse(
          "Failed to fetch goodbye data, please try again."
        );
      } else {
        return createSuccessResponse({
          ok: true,
          data: {
            goodbyeMessage: guildConfig.goodbyeMessage,
            goodbyeMessageData: guildConfig.goodbyeMessageData,
            goodbyeMessageChannel: guildConfig.goodbyeMessageChannel,
          },
        });
      }
    } catch (e) {
      return createErrorResponse(
        "Failed to fetch goodbye data, please try again."
      );
    }
  })
  .post(`/:id/goodbye`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;
      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const body = goodbyeMessageUpdate.parse(context.body);

      const guildConfigExisting = await getGuildConfig(auth.guild.id);

      if (!guildConfigExisting) {
        return createErrorResponse(
          "Failed to fetch goodbye data, please try again."
        );
      } else {
        return await db
          .update(guildConfig)
          .set({
            goodbyeMessage:
              typeof body.goodbyeMessage !== "boolean"
                ? false
                : body.goodbyeMessage,
            goodbyeMessageData: body.goodbyeMessageData
              ? body.goodbyeMessageData
              : guildConfigExisting.goodbyeMessageData,
            goodbyeMessageChannel: body.goodbyeMessageChannel
              ? body.goodbyeMessageChannel
              : guildConfigExisting.goodbyeMessageChannel,
          })
          .where(eq(guildConfig.id, guildConfigExisting.id))
          .catch(() => {
            return createErrorResponse(
              "Failed to update goodbye data, please try again."
            );
          })
          .then(() => {
            return createSuccessResponse({
              ok: true,
              data: {
                goodbyeMessage: body.goodbyeMessage,
                goodbyeMessageData: body.goodbyeMessageData,
                goodbyeMessageChannel: body.goodbyeMessageChannel,
              },
            });
          });
      }
    } catch (e) {
      return createErrorResponse(
        "Failed to update goodbye data, please try again."
      );
    }
  });
