import Elysia from "elysia";
import { app } from "../..";
import { z, ZodError } from "zod";
import { db } from "@/db";
import { guildConfig } from "@/db/schema";
import { user } from "@/db/difference";
import { eq } from "drizzle-orm";
import { err, info, warn } from "@/utils/logger";
import { Command } from "@/core/typings";
import {
  formatNonCyclicGuildData,
  getGuildConfig,
  updateDisabledCommands,
} from "@/utils/misc";
import { Guild, GuildMember } from "discord.js";

export type ECommand = Omit<Command, "run"> & {
  disabled: boolean;
  run: null;
};

// Schemas
const guildsSchema = z.object({
  ids: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .array()
    .min(1, "At least one guild ID is required"),
});

const updateCommandsSchema = z.object({
  disabled: z.string().array().default([]),
  enabled: z.string().array().default([]),
});

// Types
export interface AuthenticatedContext {
  guild: Guild;
  member: GuildMember;
  userId: string;
}

// Authentication middleware
export const createAuthMiddleware = () => {
  return async (context: any) => {
    const { headers, params } = context;
    // const userId = headers["bearer-user-id"] as string;
    const authenticationToken = headers["bearer-authorization"] as string;

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
      return new Response(
        JSON.stringify({
          ok: false,
          message:
            "Authentication required - invalid bearer-authorization header",
        }),
        { status: 401 }
      );
    }

    const userId = userSchema[0].user_id;
    const guildId = params.id;

    // Check if user ID is provided
    if (!userId) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Authentication required - missing bearer-user-id header",
        }),
        { status: 401 }
      );
    }

    // Check if guild ID is provided
    if (!guildId) {
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Guild ID is required",
        }),
        { status: 400 }
      );
    }

    // Find the guild
    const guild = app.guilds.cache.find((g) => g.id === guildId);
    if (!guild) {
      warn(`Guild not found: ${guildId} (requested by user: ${userId})`);
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Guild not found or bot is not in this guild",
        }),
        { status: 404 }
      );
    }

    // Find the user in the guild
    const member = guild.members.cache.find((m) => m.id === userId);
    if (!member) {
      warn(`User ${userId} not found in guild ${guildId}`);
      return new Response(
        JSON.stringify({
          ok: false,
          message: "You are not a member of this guild",
        }),
        { status: 403 }
      );
    }

    // Check permissions
    const hasManageGuild = member.permissions.has("ManageGuild");
    const hasAdministrator = member.permissions.has("Administrator");

    if (!hasManageGuild && !hasAdministrator) {
      warn(`User ${userId} lacks permissions in guild ${guildId}`);
      return new Response(
        JSON.stringify({
          ok: false,
          message:
            "Insufficient permissions - ManageGuild or Administrator required",
        }),
        { status: 403 }
      );
    }

    // Add authenticated context
    context.auth = {
      guild,
      member,
      userId,
    } as AuthenticatedContext;

    return;
  };
};

// Utility functions
export const createSuccessResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify({
      ok: true,
      data,
    }),
    { status }
  );
};

export const createErrorResponse = (
  message: string,
  status = 400,
  error?: any
) => {
  const response: any = {
    ok: false,
    message,
  };

  if (error && process.env.NODE_ENV === "development") {
    response.error = error instanceof Error ? error.message : error;
  }

  return new Response(JSON.stringify(response), { status });
};

// Ensure guild config exists
export const ensureGuildConfig = async (guildId: string) => {
  try {
    let guildConf = await db
      .select()
      .from(guildConfig)
      .where(eq(guildConfig.id, guildId));

    if (!guildConf || guildConf.length === 0) {
      await db.insert(guildConfig).values({ id: guildId }).execute();

      info(`Created guild config for ${guildId}`);

      guildConf = await db
        .select()
        .from(guildConfig)
        .where(eq(guildConfig.id, guildId));
    }

    return guildConf[0];
  } catch (error) {
    err(`Failed to ensure guild config for ${guildId}: ${error}`);
    throw error;
  }
};

export const dash = new Elysia({
  prefix: "/dash",
})
  // Health check endpoint
  .get("/health", () => createSuccessResponse({ status: "healthy" }))

  .get("/guild/:id/roles", async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };

    try {
      const roles = auth.guild.roles.cache
        .toJSON()
        .filter((role) => !role.managed && role.id !== auth.guild.id)
        .sort((a, b) => b.position - a.position);

      const highestBotRole = auth.guild.members.cache.find(
        (f) => f.id === app.user?.id
      )?.roles.highest;

      info(`User ${auth.userId} fetched roles for guild ${auth.guild.id}`);
      return createSuccessResponse({
        roles: roles,
        highestBotRole,
      });
    } catch (error) {
      err(`Error fetching channels for guild ${auth.guild.id}: ${error}`);
      return createErrorResponse("Failed to fetch channels", 500, error);
    }
  })

  // Get guild channels
  .get("/guild/:id/channels", async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };

    try {
      const channels = auth.guild.channels.cache
        .filter((channel) => channel.type !== 4) // Exclude category channels
        .toJSON();

      info(`User ${auth.userId} fetched channels for guild ${auth.guild.id}`);
      return createSuccessResponse(channels);
    } catch (error) {
      err(`Error fetching channels for guild ${auth.guild.id}: ${error}`);
      return createErrorResponse("Failed to fetch channels", 500, error);
    }
  })

  // Check if bot is in multiple guilds
  .post("/guilds/in", async ({ body, headers }) => {
    try {
      const authenticationToken = headers["bearer-authorization"] as string;

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
        return new Response(
          JSON.stringify({
            ok: false,
            message:
              "Authentication required - invalid bearer-authorization header",
          }),
          { status: 401 }
        );
      }

      const data = guildsSchema.parse(body);
      // console.log("Received guild IDs:", data.ids);

      if (!Array.isArray(data.ids) || data.ids.length === 0) {
        // console.error("No valid guild IDs received");
        return new Response(
          JSON.stringify({
            ok: false,
            message: "No valid guild IDs provided",
            data: [],
          }),
          { status: 400 }
        );
      }

      const r: Guild[] = [];

      for (let i = 0; i < data.ids.length; i++) {
        const id = data.ids[i].id;
        if (!id || typeof id !== "string") {
          // console.warn(`Invalid guild ID format: ${JSON.stringify(id)}`);
          continue;
        }
        const guild = app.guilds.cache.find((f) => f.id === id);
        // console.log(
        //   `Checking guild ID ${id}: ${guild ? "Found" : "Not found"}`
        // );
        if (guild && guild.members.cache.has(userSchema[0].user_id as string)) {
          r.push(guild);
        }
      }

      // console.log(
      //   `Found ${r.length} guilds out of ${data.ids.length} requested`
      // );

      return new Response(
        JSON.stringify({
          ok: true,
          data: r,
        }),
        {
          status: 200,
        }
      );
    } catch (e) {
      console.error("Error processing guild IDs request:", e);
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Failed to check servers.",
          error: e instanceof Error ? e.message : "Unknown error",
        }),
        {
          status: 400,
        }
      );
    }
  })

  // Get specific role in guild
  .get("/guild/:id/role/:roleId", async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth, params } = context as unknown as {
      auth: AuthenticatedContext;
      params: any;
    };
    const { roleId } = params;

    try {
      const role = auth.guild.roles.cache.find((r) => r.id === roleId);

      if (!role) {
        return createErrorResponse("Role not found", 404);
      }

      info(
        `User ${auth.userId} fetched role ${roleId} from guild ${auth.guild.id}`
      );
      return createSuccessResponse(role);
    } catch (error) {
      err(
        `Error fetching role ${roleId} from guild ${auth.guild.id}: ${error}`
      );
      return createErrorResponse("Failed to fetch role", 500, error);
    }
  })

  // Get all roles in guild
  // .get("/guild/:id/roles", async (context) => {
  //   const authResult = await createAuthMiddleware()(context);
  //   if (authResult) return authResult;

  //   const { auth } = context as unknown as { auth: AuthenticatedContext };

  //   try {
  //     const roles = auth.guild.roles.cache
  //       .toJSON()
  //       .filter((role) => !role.managed && role.id !== auth.guild.id)
  //       .sort((a, b) => b.position - a.position); // Sort by position (highest first)

  //     info(`User ${auth.userId} fetched roles for guild ${auth.guild.id}`);
  //     return createSuccessResponse(roles);
  //   } catch (error) {
  //     err(`Error fetching roles for guild ${auth.guild.id}: ${error}`);
  //     return createErrorResponse("Failed to fetch roles", 500, error);
  //   }
  // })

  // Get guild information
  .get("/guild/:id", async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };

    try {
      const guildData = formatNonCyclicGuildData(auth.guild);

      info(`User ${auth.userId} fetched guild data for ${auth.guild.id}`);
      return createSuccessResponse({
        ...guildData,
        userPermissions: {
          administrator: auth.member.permissions.has("Administrator"),
          manageGuild: auth.member.permissions.has("ManageGuild"),
        },
      });
    } catch (error) {
      err(`Error fetching guild data for ${auth.guild.id}: ${error}`);
      return createErrorResponse(
        "Failed to fetch guild information",
        500,
        error
      );
    }
  })

  // Get commands for guild
  .get("/commands/:id", async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };

    try {
      const guildConf = await ensureGuildConfig(auth.guild.id);

      if (!guildConf) {
        return createErrorResponse("Failed to load guild configuration", 500);
      }

      const commandArray: Record<string, ECommand[]> = {};
      const disabledCommands = guildConf.disabledCommands || [];

      app.commands.forEach((cmd) => {
        const isDisabled = disabledCommands.includes(cmd.name.toLowerCase());

        const command: ECommand = {
          ...cmd,
          run: null,
          disabled: isDisabled,
        };

        const category = cmd.category as string;
        if (commandArray[category]) {
          commandArray[category].push(command);
        } else {
          commandArray[category] = [command];
        }
      });

      // Sort commands within each category
      Object.keys(commandArray).forEach((category) => {
        commandArray[category].sort((a, b) => a.name.localeCompare(b.name));
      });

      info(`User ${auth.userId} fetched commands for guild ${auth.guild.id}`);
      return createSuccessResponse(commandArray);
    } catch (error) {
      err(`Error fetching commands for guild ${auth.guild.id}: ${error}`);
      return createErrorResponse("Failed to fetch commands", 500, error);
    }
  })

  // Update commands for guild
  .post("/update-commands/:id", async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth, body } = context as unknown as {
      auth: AuthenticatedContext;
      body: any;
    };

    try {
      const data = updateCommandsSchema.parse(body);

      const currentConfig = await ensureGuildConfig(auth.guild.id);
      if (!currentConfig) {
        return createErrorResponse("Failed to load guild configuration", 500);
      }

      // Validate that all command names exist
      const allCommandNames = Array.from(app.commands.keys()).map((name) =>
        name.toLowerCase()
      );
      const invalidCommands = [...data.disabled, ...data.enabled].filter(
        (cmd) => !allCommandNames.includes(cmd.toLowerCase())
      );

      if (invalidCommands.length > 0) {
        return createErrorResponse(
          `Invalid command names: ${invalidCommands.join(", ")}`,
          400
        );
      }

      const updatedCommands = updateDisabledCommands(
        currentConfig.disabledCommands || [],
        data.enabled,
        data.disabled
      );

      await db
        .update(guildConfig)
        .set({
          disabledCommands: updatedCommands,
        })
        .where(eq(guildConfig.id, auth.guild.id));

      info(
        `User ${auth.userId} updated commands for guild ${auth.guild.id}: +${data.enabled.length} enabled, +${data.disabled.length} disabled`
      );

      return createSuccessResponse({
        message: "Commands updated successfully",
        enabled: data.enabled,
        disabled: data.disabled,
        totalDisabled: updatedCommands.length,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return createErrorResponse("Invalid request format", 400, error.errors);
      }
      err(`Error updating commands for guild ${auth.guild.id}: ${error}`);
      return createErrorResponse("Failed to update commands", 500, error);
    }
  })

  // Get guild configuration
  .get("/config/:id", async (context) => {
    const authResult = await createAuthMiddleware()(context);
    if (authResult) return authResult;

    const { auth } = context as unknown as { auth: AuthenticatedContext };

    try {
      const config = await ensureGuildConfig(auth.guild.id);

      if (!config) {
        return createErrorResponse("Failed to load guild configuration", 500);
      }

      info(`User ${auth.userId} fetched config for guild ${auth.guild.id}`);
      return createSuccessResponse(config);
    } catch (error) {
      err(`Error fetching config for guild ${auth.guild.id}: ${error}`);
      return createErrorResponse("Failed to fetch configuration", 500, error);
    }
  })
  .get(`/guild/:id/channels`, async (context) => {
    try {
      const authResult = await createAuthMiddleware()(context);
      if (authResult) return authResult;

      const { auth } = context as unknown as { auth: AuthenticatedContext };

      const guild = app.guilds.cache.find((f) => f.id === auth.guild.id);
      // console.log(guild);
      if (!guild)
        return createErrorResponse(
          "Failed to find all channels. Please try again."
        );

      const channels = guild.channels.cache.toJSON();
      // console.log(channels.length);
      if (!channels || channels.length <= 0)
        return createErrorResponse(
          "Failed to find all channels. Please try again."
        );

      return createSuccessResponse({
        ok: true,
        data: channels,
      });
    } catch (e) {
      return createErrorResponse(
        "Failed to find all channels. Please try again."
      );
    }
  })

  // Error handling
  .onError(({ error, code }) => {
    //@ts-ignore
    err(`API Error [${code}]: ${error.message}`);

    if (code === "VALIDATION") {
      return createErrorResponse("Invalid request data", 400, error.message);
    }

    if (code === "NOT_FOUND") {
      return createErrorResponse("Endpoint not found", 404);
    }

    return createErrorResponse("Internal server error", 500);
  });
