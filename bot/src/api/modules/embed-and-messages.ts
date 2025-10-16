import Elysia from "elysia";
import {
  AuthenticatedContext,
  createAuthMiddleware,
  createErrorResponse,
  createSuccessResponse,
} from "../dash";
import { db } from "@/db";
import {
  customCommand,
  guildConfig,
  messageAndEmbeds,
  messages,
} from "@/db/schema";
import { and, eq, gte, isNotNull, ne, desc } from "drizzle-orm";
import { createId, getGuildConfig, messagePayloadSchema } from "@/utils";
import { z } from "zod";
import { app } from "@/index";
import { GuildTextBasedChannel, TextBasedChannel } from "discord.js";

const bodyPayload = z.object({
  channelId: z.string(),
  name: z.string(),
  data: z.string(),
});

export const embedAndMessagesModule = new Elysia({
  prefix: "/embeds-and-messages",
}).post(`/:id`, async (context) => {
  const authResult = await createAuthMiddleware()(context);
  if (authResult) return authResult;

  const { auth } = context as unknown as { auth: AuthenticatedContext };
  const rawBody = bodyPayload.parse(context.body);
  const body = messagePayloadSchema.parse(JSON.parse(rawBody.data));

  const guild = app.guilds.cache.find((f) => f.id === auth.guild.id);
  if (!guild) return createErrorResponse("Failed to find guild.");
  const channel = guild.channels.cache.find(
    (f) => f.id === rawBody.channelId
  ) as GuildTextBasedChannel;
  if (!channel) return createErrorResponse("Failed to find channel.");

  return channel.send(body).then(async (message) => {
    await db.insert(messageAndEmbeds).values({
      guildId: guild.id,
      body: rawBody.data,
      name: rawBody.name,
      id: message.id,
    });

    return createSuccessResponse("Successfully created message.")
  }).catch((err) => {
    return createErrorResponse("Failed to create message, please try again.")
  })
});
