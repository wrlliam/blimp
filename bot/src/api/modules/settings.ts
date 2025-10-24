import Elysia from "elysia";
import {
  AuthenticatedContext,
  createAuthMiddleware,
  createErrorResponse,
  createSuccessResponse,
} from "../dash";
import { z } from "zod";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGuildConfig } from "@/utils";

const permissionUpdateBody = z.object({
  type: z.enum(["ADMINS", "MODS", "HELPERS"]),
  roles: z.string().array(),
});

export const settingsModule = new Elysia({
  prefix: "/settings",
})
  .get(`/:id/permissions`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const exisitingData = await getGuildConfig(auth.guild.id);
      if (!exisitingData)
        return createErrorResponse("Unable to find current guild config.");

      return createSuccessResponse({
        admins: exisitingData.permAdministrators,
        mods: exisitingData.permModerators,
        helpers: exisitingData.permHelpers,
      });
    } catch (e) {
      return createErrorResponse("Failed to update permissions.");
    }
  })
  .post(`/:id/permissions`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const body = permissionUpdateBody.parse(context.body);

      const exisitingData = await getGuildConfig(auth.guild.id);
      if (!exisitingData)
        return createErrorResponse("Unable to find current guild config.");
      switch (body.type) {
        case "ADMINS":
          await db
            .update(guildConfig)
            .set({
              permAdministrators: body.roles,
            })
            .where(eq(guildConfig.id, auth.guild.id))
            .execute();
          break;
        case "MODS":
          await db
            .update(guildConfig)
            .set({
              permModerators: body.roles,
            })
            .where(eq(guildConfig.id, auth.guild.id))
            .execute();
          break;
        case "HELPERS":
          await db
            .update(guildConfig)
            .set({
              permHelpers: body.roles,
            })
            .where(eq(guildConfig.id, auth.guild.id))
            .execute();
          break;
        default:
          return createErrorResponse("Please provide a valid permission type.");
      }

      return createSuccessResponse("Successfully updated permissions.");
    } catch (e) {
      return createErrorResponse("Failed to update permissions.");
    }
  });
