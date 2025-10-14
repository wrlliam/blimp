import {
  text,
  boolean,
  json,
  date,
  pgSchema,
  timestamp,
} from "drizzle-orm/pg-core";
import { MessageReference } from "discord.js";

export const backendSchema = pgSchema("backend");

export const guildConfig = backendSchema.table("guild_config", {
  id: text("id").primaryKey(), // guild id
  disabledCommands: text("disabled_command").array().notNull().default([]),
  customCommandPrefix: text("custom_command_prefix").default("!"),

  // welcome & goodbye
  welcomeMessage: boolean("welcome_messafe").default(false),
  welcomeMessageData: text("welcome_message_data"),

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

export const reactionRole = backendSchema.table("reaction_role", {
  id: text("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  uniqueId: text("unique_id").notNull(),
  message: text("message").notNull(), // message payload JSON str
  reactions: text("reactions").notNull().array(), // Array of json stringifies, { roleId: string, emoji: string; label: string; style: string}
  messageId: text("message_id"), // links to existing message if there is one
  channelId: text("channel_id"),
  name: text("name").notNull(),
});

export type ReactionRoleSelect = typeof reactionRole.$inferSelect;
export type ReactionRoleInsert = typeof reactionRole.$inferInsert;

export const infraction = backendSchema.table("infraction", {
  id: text("id").primaryKey(), // unique id,
  userId: text("user_id").notNull(),
  guildId: text("guild_id").notNull(),
  silenced: boolean("silenced").default(false),
  permanent: boolean("permanent").default(false),
  reason: text("reason").notNull(),
  proofUrl: text("proof_url"),
  moderatorId: text("moderator_id").notNull(),
  type: text("infraction_type").notNull(),
  history: json("history")
    .$type<
      {
        id: string;
        content: string | null | undefined;
        time: number;
        edited: number | undefined | null;
        reference: MessageReference;
      }[]
    >()
    .array(),

  timestampIssued: date("date_issued", {
    mode: "string",
  }).defaultNow(),
});

export type InfractionSelect = typeof infraction.$inferSelect;
export type InfractionInsert = typeof infraction.$inferInsert;

export const customCommand = backendSchema.table("custom_command", {
  id: text("id").primaryKey(),
  guildId: text("guild_id"),
  createdBy: text("created_by_id"),
  commandName: text("command_name"),
  commandBody: text("command_body"),
  created: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export type CCommandSelect = typeof customCommand.$inferSelect;
export type CCommandInsert = typeof customCommand.$inferInsert;


//Statistics

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

