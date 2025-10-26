# ---- Base Stage ----
FROM oven/bun:1 AS base
WORKDIR /app

# ---- Dependencies (with dev) ----
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install

# ---- Build (optional) ----
FROM deps AS builder
COPY . . 
# If you have a build step (e.g., TypeScript compile or tests) for the bot, do it here.
# For example: RUN bun run build (if such a script exists)
# If no build is needed (Bun can run TS directly), this stage just holds the files.
# We can still use this stage to copy files from in the final stage.

# ---- Production Dependencies Only ----
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --production

# ---- Final Stage ----
FROM base AS final
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy application code from builder stage.
COPY --from=builder /app ./
# (This brings in the bot’s source code. We copy the whole app directory except node_modules.)
# We deliberately did not copy any .env here; pass env vars in via Docker runtime.

EXPOSE 3001

CMD ["sh", "-c", "bun run db:all && bun run dev"]
