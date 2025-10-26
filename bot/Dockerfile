# Stage 1: Base (with Bun)
FROM oven/bun:latest AS base
WORKDIR /app

# Stage 2: Dependencies install
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Stage 3: Build (if the bot has any build step, e.g. TypeScript compile)
# If not (if Bun runs TS directly), we might skip a separate build stage.
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set production environment (if needed for any build optimizations)
ENV NODE_ENV=production
# Example: If there's a build script (e.g., tsc or bun build), run it. Otherwise, skip.
# RUN bun run build 
# (Assume the bot may not need a build step aside from migrations)

# Stage 4: Runner
FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files from build stage
COPY --from=build /app/node_modules ./node_modules
# if a build produces a dist folder, otherwise copy source
COPY --from=build /app/dist ./dist
# example: copy compiled JS files if any
COPY --from=build /app/*.js ./      
COPY --from=build /app/.env ./
COPY --from=build /app/package.json ./

# Switch to non-root user for security
USER bun  # (The Bun image has a 'bun' user by default) 

# Expose port for API
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Run migrations and then start the bot & API
CMD bun run db:all && bun run start
