FROM oven/bun:1 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the bot (if you have a build step)
# RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 botgroup
RUN adduser --system --uid 1001 botuser

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/drizzle.config.ts ./

# Copy source code
COPY --chown=botuser:botgroup . .

USER botuser

RUN bun run db:all
# Run the bot
CMD ["bun", "run", "src/index.ts"]