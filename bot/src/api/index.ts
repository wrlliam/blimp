import Elysia from "elysia";
import { dash } from "./dash";
import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { modules } from "./modules";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { user } from "@/db/difference"

export const findUserFromAuthoriationToken = async (
  authenticationToken: string
) => {
  if (!authenticationToken) {
    return new Response(
      JSON.stringify({
        ok: false,
        message:
          "Authentication required - missing bearer-authorization header",
      }),
      { status: 401 }
    );
  }

  const userSchema = await db
    .select()
    .from(user)
    .where(eq(user.authentication_token, authenticationToken));

  if (!userSchema || !userSchema[0]) {
    return [
      null,
      new Response(
        JSON.stringify({
          ok: false,
          message:
            "Authentication required - invalid bearer-authorization header",
        }),
        { status: 401 }
      ),
    ];
  }

  const userId = userSchema[0].user_id;

  // Check if user ID is provided
  if (!userId) {
    return [
      userSchema[0],
      new Response(
        JSON.stringify({
          ok: false,
          message: "Authentication required - missing bearer-user-id header",
        }),
        { status: 401 }
      ),
    ];
  }

  return [userSchema[0], null];
};

export const api = new Elysia()
  .use(cors())
  .use(
    logger({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    })
  )
  .get(`/`, () => ({
    cookies: "with",
    milk: true,
  }))
  .use(dash)
  .use(modules);
