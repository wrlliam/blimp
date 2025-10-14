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
import chalk from "chalk";

const setPrefixSchema = z.object({
  prefix: z.string(),
});

const createCommandSchema = z.object({
  name: z.string(),
  data: z.string(),
});

const deleteCommandSchema = z.object({
  id: z.string(),
});

export const customCommandModule = new Elysia({
  prefix: "/custom-commands",
})
  .delete(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const body = deleteCommandSchema.parse(context.body);

      return await db
        .delete(customCommand)
        .where(eq(customCommand.id, body.id))
        .catch((e) => {
          return createErrorResponse(
            "Unable to delete command, please try again."
          );
        }).then(() => {
          return createSuccessResponse({
            ok: true,
            msg: "Command deleted successfully."
          });
        })
    } catch (e) {
      return createErrorResponse("Unable to delete command, please try again.");
    }
  })
  .post(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const body = createCommandSchema.parse(context.body);

      console.log(body);
      const id = createId();
      await db
        .insert(customCommand)
        .values({
          id,
          commandName: body.name.split(" ").join("-").toLowerCase(),
          commandBody: body.data,
          createdBy: auth.member.id,
          guildId: auth.guild.id,
        })
        .execute();

      return createSuccessResponse({
        ok: true,
        id,
      });
    } catch (e) {
      return createErrorResponse(
        "Failed to create custom command. Please try again."
      );
    }
  })
  .get("/:id/all", async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const guildConfigData = await getGuildConfig(auth.guild.id);
      if (!guildConfigData) {
        return createErrorResponse(
          "Unable to find guild data. Please speak within your server and refresh the page."
        );
      }

      const customCommandData = await db
        .select()
        .from(customCommand)
        .where(eq(customCommand.guildId, auth.guild.id));

      if (!customCommandData || customCommandData.length < 0) {
        return {
          ok: true,
          data: [],
        };
      }

      return {
        ok: true,
        data: customCommandData,
      };
    } catch (e) {
      return createErrorResponse(
        "Failed to fetch all custom commands for your server, please refresh and try again."
      );
    }
  })
  .post(`/:id/prefix`, async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };

    const guildConfigData = await getGuildConfig(context.params.id);
    if (!guildConfigData) {
      return createErrorResponse(
        "Unable to find guild data. Please speak within your server and refresh the page."
      );
    }

    try {
      const body = setPrefixSchema.parse(context.body);

      const prefix = body.prefix.split(" ").join("-");
      await db
        .update(guildConfig)
        .set({
          customCommandPrefix: prefix,
        })
        .where(eq(guildConfig.id, auth.guild.id))
        .execute();

      return {
        ok: true,
        prefix,
      };
    } catch (e) {
      return createErrorResponse("Failed to set prefix, please try again.");
    }
  })
  .get(`/:id/prefix`, async (context) => {
    const auth = await createAuthMiddleware()(context);
    if (auth) return auth;

    const guildConfig = await getGuildConfig(context.params.id);
    if (!guildConfig) {
      return createErrorResponse(
        "Unable to find guild data. Please speak within your server and refresh the page."
      );
    }

    return {
      ok: true,
      data: guildConfig.customCommandPrefix,
    };
  });
