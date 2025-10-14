import { boolean, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

export const frontendSchema = pgSchema("frontend");

export const user = frontendSchema.table("user", {
  id: text("id").primaryKey(),
  user_id: text("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  authentication_token: text("authentication_token").notNull(),
  guilds: text("guilds").notNull(),
});

export type User = typeof user.$inferSelect;
export type UserInsert = typeof user.$inferInsert;
