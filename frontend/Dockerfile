# ---- Stage 1: Base ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Stage 2: Dependencies (with dev) ----
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install

# ---- Stage 3: Build ----
FROM deps AS builder
COPY . .
RUN --mount=type=secret,id=env,dst=.env bun run build

# ---- Stage 4: Production Dependencies Only ----
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install

# ---- Stage 5: Final Image ----
FROM base AS final
WORKDIR /app

# Copy only what's needed to run the server
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.* ./ 
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/src ./src

# Use non-root user for safety
USER bun

# Expose Next.js default port
EXPOSE 3000

# Run database setup and start app
CMD ["sh", "-c", "bun run db:all && bun run start"]
