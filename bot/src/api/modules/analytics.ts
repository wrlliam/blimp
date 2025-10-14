import Elysia from "elysia";
import {
  AuthenticatedContext,
  createAuthMiddleware,
  createErrorResponse,
} from "../dash";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { and, eq, gte, isNotNull, ne, desc } from "drizzle-orm";

export const analyticsModule = new Elysia({
  prefix: "/analytics",
})
  .get("/messages/:id/commands", async (context) => {
    try {
      const user = await createAuthMiddleware()(context);
      if (user) return user;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const messagesFetch = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.guildId, auth.guild.id),
            ne(messages.command, ""),
            isNotNull(messages.command)
          )
        )
        .orderBy(desc(messages.created)) 
        .limit(15);

      return messagesFetch;
    } catch (e) {
      return createErrorResponse("Failed to fetch commands.");
    }
  })
  .get("/messages/:id", async (context) => {
    try {
      const user = await createAuthMiddleware()(context);
      if (user) return user;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const messagesFetch = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.guildId, auth.guild.id),
            gte(messages.created, thirtyDaysAgo)
          )
        );

      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();

      const result: Record<string, number> = {};
      for (let i = 1; i <= daysInMonth; i++) {
        result[i.toString()] = 0;
      }

      messagesFetch.forEach((msg) => {
        if (!msg.created) return; 
        const msgDate = new Date(msg.created);
        const dayOfMonth = msgDate.getDate();
        result[dayOfMonth.toString()]++;
      });

      const output = Object.entries(result).map(([day, count]) => ({
        day: parseInt(day),
        total: count,
      }));

      return output;
    } catch (e) {
      console.log(e);
      return createErrorResponse("Failed to fetch messages.");
    }
  });
