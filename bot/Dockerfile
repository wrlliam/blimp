FROM oven/bun:1 AS base
WORKDIR /app

# Install all dependencies (including dev)
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code and config (including drizzle.config.ts, etc.)
COPY . .

# (Optionally run any build step here, if applicable)
# e.g. RUN bun run build

# Expose port for Dokploy routing
EXPOSE 3001

# Entrypoint: run migrations then start the bot
# If db:all fails (e.g. tables exist), ignore error and continue.
ENTRYPOINT ["sh", "-c", "bun run db:all || true && bun run dev"]
