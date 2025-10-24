import { env } from "@/env";
import { RedisClient } from "bun";

export const redis = new RedisClient(env.REDIS_URL, {
  autoReconnect: true,
});
