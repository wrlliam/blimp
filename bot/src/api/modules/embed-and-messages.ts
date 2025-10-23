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
import {
  createId,
  formMessagePayload,
  getGuildConfig,
  MessagePayloadCreationData,
  messagePayloadSchema,
} from "@/utils";
import { z } from "zod";
import { app } from "@/index";
import { GuildTextBasedChannel, TextBasedChannel } from "discord.js";
import { env } from "@/env";

const bodyPayload = z.object({
  channelId: z.string(),
  name: z.string(),
  data: z.string(),
});

const updatePayload = z.object({
  messageId: z.string(),
  data: z.object({
    name: z.string(),
    data: z.string(),
  }),
});

const deletePayload = z.object({
  messageId: z.string(),
});

export const embedAndMessagesModule = new Elysia({
  prefix: "/embeds-and-messages",
})
  .delete(`/:id`, async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };
    try {
      const body = deletePayload.parse(context.body);

      const messageSchema = await db
        .select()
        .from(messageAndEmbeds)
        .where(
          and(
            eq(messageAndEmbeds.guildId, auth.guild.id),
            eq(messageAndEmbeds.id, body.messageId)
          )
        );

      if (!messageSchema || messageSchema.length <= 0) {
        return createErrorResponse(
          "Unable to delete message, please try again later."
        );
      }

      const messageData = messageSchema[0];

      if (messageData.guildId !== auth.guild.id) {
        return createErrorResponse(
          "Unable to delete message, please try again later."
        );
      }

      fetch(
        `https://discord.com/api/v9/channels/${messageData.channelId}/messages/${messageData.id}`,
        {
          method: "DELETE",
          headers: new Headers({
            Authorization: `Bot ${env.TOKEN}`,
            "Content-type": `application/json`,
          }),
        }
      )
        .then(async (res) => {
          await db
            .delete(messageAndEmbeds)
            .where(eq(messageAndEmbeds.id, messageData.id))
            .then(() => {
              if (res.status === 200) {
                return createSuccessResponse({
                  ok: true,
                  msg: "Successfully delete message.",
                });
              }
            })
            .catch(() => {
              return createErrorResponse(
                "Failed to delete message, please try again later."
              );
            });
        })
        .catch((e) => {
          return createErrorResponse(
            "Failed to delete message, please try again later."
          );
        });
    } catch (e) {
      return createErrorResponse(
        "Unable to delete message, please try again later."
      );
    }
  })
  .post(`/:id/update`, async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };
    try {
      const body = updatePayload.parse(context.body);
      const content = formMessagePayload(
        JSON.parse(body.data.data) as MessagePayloadCreationData
      );

      const messageSchema = await db
        .select()
        .from(messageAndEmbeds)
        .where(
          and(
            eq(messageAndEmbeds.guildId, auth.guild.id),
            eq(messageAndEmbeds.id, body.messageId)
          )
        );

      if (!messageSchema || messageSchema.length <= 0) {
        return createErrorResponse(
          "Unable to update message, please try again later."
        );
      }

      const messageData = messageSchema[0];

      if (messageData.guildId !== auth.guild.id) {
        return createErrorResponse(
          "Unable to update message, please try again later."
        );
      }

      const guild = app.guilds.cache.find((f) => f.id === messageData.guildId);

      if (!guild) {
        return createErrorResponse(
          "Unable to update message, please try again later."
        );
      }

      const channel = guild.channels.cache.find(
        (f) => f.id === messageData.channelId
      ) as GuildTextBasedChannel;

      if (!channel) {
        return createErrorResponse(
          "Unable to update message, please try again later."
        );
      }

      fetch(
        `https://discord.com/api/v9/channels/${channel.id}/messages/${messageData.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(content),
          headers: new Headers({
            Authorization: `Bot ${env.TOKEN}`,
            "Content-type": `application/json`,
          }),
        }
      )
        .then(async (res) => {
          await db
            .update(messageAndEmbeds)
            .set({
              name: body.data.name,
              body: JSON.stringify(content),
            })
            .then(() => {
              if (res.status === 200) {
                return createSuccessResponse({
                  ok: true,
                  msg: "Successfully updated message.",
                });
              }
            })
            .catch(() => {
              return createErrorResponse(
                "Failed to update message, please try again later."
              );
            });
        })
        .catch((e) => {
          return createErrorResponse(
            "Failed to update message, please try again later."
          );
        });
    } catch (e) {
      // console.log(e);
      return createErrorResponse(
        "Unable to update message, please try again later."
      );
    }
  })
  .get(`/:id`, async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };
    try {
      const guildMessages = await db
        .select()
        .from(messageAndEmbeds)
        .where(eq(messageAndEmbeds.guildId, auth.guild.id));

      return createSuccessResponse(guildMessages);
    } catch (e) {
      return createErrorResponse(
        "Unable to find previous guild messages, please try again."
      );
    }
  })
  .post(`/:id`, async (context) => {
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

    return channel
      .send(body)
      .then(async (message) => {
        await db.insert(messageAndEmbeds).values({
          guildId: guild.id,
          body: rawBody.data,
          name: rawBody.name,
          channelId: channel.id,
          id: message.id,
        });

        return createSuccessResponse("Successfully created message.");
      })
      .catch((err) => {
        return createErrorResponse(
          "Failed to create message, please try again."
        );
      });
  });
