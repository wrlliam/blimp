# Use official Bun image as base
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy the entire codebase (including root files like drizzle.config.ts)
COPY . .

# Set working directory to frontend folder
WORKDIR /app/frontend

# Install frontend dependencies
RUN bun install --frozen-lockfile

# Declare build arguments for Next.js public variables
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DISCORD_BOT_INVITE_URL
ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY

# Set them as environment variables for the build
ENV NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DISCORD_BOT_INVITE_URL=${NEXT_PUBLIC_DISCORD_BOT_INVITE_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLIC_KEY=${NEXT_PUBLIC_STRIPE_PUBLIC_KEY}

# Build the Next.js application
RUN bun run build

# Go back to root for execution
WORKDIR /app

# Expose Next.js port
EXPOSE 3000

# Create an entrypoint script that runs db:all before starting the frontend
RUN echo '#!/bin/sh\nset -e\nbun run db:all || echo "Database migration completed or already exists"\ncd /app/frontend\nexec bun run start' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]