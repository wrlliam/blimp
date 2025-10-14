import { boolean, date, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

export const backendSchema = pgSchema("backend");

export const messages = backendSchema.table("messages", {
  id: text("id").primaryKey(), // message id,
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  bot: boolean("bot").default(false),
  command: text("command_name").default(""),
  created: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type MessagesSelect = typeof messages.$inferSelect;
export type MessagesInsert = typeof messages.$inferInsert;

export const guildConfig = backendSchema.table("guild_config", {
  id: text("id").primaryKey(), // guild id
  disabledCommands: text("disabled_command").array().notNull().default([]),

  // welcome & goodbye
  welcomeMessage: boolean("welcome_message").default(false),
  welcomeMessageData: text("welcome_message_data"),
  welcomeMessageChannel: text("welcome_message_channel"),

  goodbyeMessage: boolean("goodbye_message").default(false),
  goodbyeMessageData: text("goodbye_message_data"),
  goodbyeMessageChannel: text("goodbye_message_channel"),
  
  //Logging
  logsChannelId: text("logs_channel_id"),
  enabledLogs: text("enabled_loggers")
    .array()
    .notNull()
    .default(["guildMemberAdd", "guildMemberRemove", "messageDelete"]),

  // toggables
  reactionRoles: boolean("reaction_roles").notNull().default(false),
});

export type GuildConfigSelect = typeof guildConfig.$inferSelect;
export type GuildConfigInsert = typeof guildConfig.$inferInsert;

export const customCommand = backendSchema.table("custom_command", {
  id: text("id").primaryKey(),
  guildId: text("guild_id"),
  createdBy: text("created_by_id"),
  commandName: text("command_name"),
  commandBody: text("command_body"),
  created: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CCommandSelect = typeof customCommand.$inferSelect;
export type CCommandInsert = typeof customCommand.$inferInsert;
