# Stage 1: Base (with Bun)
FROM oven/bun:latest AS base
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app
# Copy dependency definitions
COPY package.json bun.lockb ./
# Install dependencies (including dev dependencies for building)
RUN bun install --frozen-lockfile

# Stage 3: Build (using Next.js standalone output)
FROM base AS build
WORKDIR /app
# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source code
COPY . .
# Ensure production env for build and disable Next telemetry (optional)
ENV NODE_ENV=production 
ENV NEXT_TELEMETRY_DISABLED=1
# If next.config.js is configured for standalone output, build the Next.js app
RUN bun run build

# Stage 4: Production Runner
FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user (if not using default bun user)
RUN adduser --system --uid 1001 nextjs

# Copy the built output (standalone app) and static files from build stage
COPY --from=build --chown=nextjs:bun /app/.next/standalone ./
COPY --from=build --chown=nextjs:bun /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:bun /app/public ./public

# (If not using standalone output, alternatively copy necessary files like .next folder and node_modules)

# Copy the package.json (optional, for reference or runtime if needed)
COPY --from=build /app/package.json ./

# Copy .env file to provide environment variables (optional - could also be mounted at runtime)
COPY --from=build /app/.env ./

# Ensure the app will run as non-root
USER nextjs

# Expose and set port/host
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run database migrations before starting (ensuring DB is accessible at runtime)
# We use a shell form to run two commands: migrate then start
CMD bun run db:all && bun run start
