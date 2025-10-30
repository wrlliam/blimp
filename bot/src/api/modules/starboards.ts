import Elysia from "elysia";
import {
  AuthenticatedContext,
  createAuthMiddleware,
  createErrorResponse,
  createSuccessResponse,
} from "../dash";
import { db } from "@/db";
import { starboards, StarboardsInsert } from "@/db/schema";
import { eq } from "drizzle-orm";
import z from "zod";
import { createId } from "@/utils";

const updateBodySchema = z.object({
  enabled: z.boolean().optional(),
  guildId: z.string().optional(),
  name: z.string().optional(),
  ignoreSelfStar: z.boolean().optional(),
  ignoredRoles: z.string().optional(),
  ignoredChannels: z.string().optional(),
  channelId: z.string().optional(),
  amountToStars: z.number().optional(),
  starEmoji: z.string().optional(),
});

export const starboardModule = new Elysia({
  prefix: "/starboard",
})
  .get(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const rawStarboards = await db
        .select()
        .from(starboards)
        .where(eq(starboards.guildId, auth.guild.id));

      if (!rawStarboards)
        return createErrorResponse("Failed to fetch starboard data.");

      return createSuccessResponse(rawStarboards);
    } catch (e) {
      return createErrorResponse("Failed to fetch starboard data.");
    }
  })
  .patch(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const body = updateBodySchema.parse(context.body);

      return await db
        .update(starboards)
        .set(body)
        .where(eq(starboards.guildId, auth.guild.id))
        .execute()
        .then(() => {
          return createSuccessResponse("Successfully updated starboard");
        })
        .catch(() => {
          return createErrorResponse("Failed to update starboard data.");
        });
    } catch (e) {
      return createErrorResponse("Failed to update starboard data.");
    }
  })
  .post(`/:id`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };
      const body = updateBodySchema.parse(context.body) as StarboardsInsert;

      return await db
        .insert(starboards)
        .values({
            ...body,
            id: createId()
        })
        .execute()
        .then(() => {
          return createSuccessResponse("Successfully created starboard");
        })
        .catch(() => {
          return createErrorResponse("Failed to create starboard data.");
        });
    } catch (e) {
      return createErrorResponse("Failed to create starboard data.");
    }
  });
