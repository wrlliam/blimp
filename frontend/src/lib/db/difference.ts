import {
  boolean,
  date,
  integer,
  pgSchema,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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

  // leveling

  leveling: boolean("leveling").default(false),
  levelingMessage: text("leveling_message").default(
    "Congrats on leveling up <@$user.id>! You are now **level $user.level$**"
  ),

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

export const messageAndEmbeds = backendSchema.table("message_and_embeds", {
  id: text("id").primaryKey(), // Message ID
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id"),
  name: text("name"),
  body: text("body"),
  created: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type MessageAndEmbedsSelect = typeof messageAndEmbeds.$inferSelect;
export type MessageAndEmbedsInsert = typeof messageAndEmbeds.$inferInsert;

export const leveling = backendSchema.table("leveling", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  xp: integer("xp").default(0).notNull(),
  levelId: text("level_id"),
});

export type LevelingSelect = typeof leveling.$inferSelect;
export type LevelingInsert = typeof leveling.$inferInsert;

export const guildLevel = backendSchema.table("guild_level", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  xpRequired: integer("required_xp").default(125),
  level: integer("level").notNull(),
  roleId: text("role_id").notNull(),
});

export type GuildLevelSelect = typeof guildLevel.$inferSelect;
export type GuildLevelInsert = typeof guildLevel.$inferInsert;

export const guildLevelMultiplier = backendSchema.table(
  "guild_level_multiplier",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    name: text("name"),
    multiplier: integer("mulitplier").default(2),
    roleId: text("role_id"),
  }
);
``;

export type GuildLevelMultiSelect = typeof guildLevelMultiplier.$inferSelect;
export type GuildLevelMultiInsert = typeof guildLevelMultiplier.$inferInsert;
