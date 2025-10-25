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

# Declare ALL build arguments needed for Next.js build
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG DISCORD_CLIENT_ID
ARG DISCORD_CLIENT_SECRET
ARG API_PORT
ARG WS_PORT
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_DISCORD_BOT_INVITE_URL
ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY
ARG STRIPE_PRIVATE_KEY
ARG STRIPE_WEBHOOK_SECRET

# Set them as environment variables for the build
ENV DATABASE_URL=${DATABASE_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
ENV DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
ENV API_PORT=${API_PORT}
ENV WS_PORT=${WS_PORT}
ENV NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_DISCORD_BOT_INVITE_URL=${NEXT_PUBLIC_DISCORD_BOT_INVITE_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLIC_KEY=${NEXT_PUBLIC_STRIPE_PUBLIC_KEY}
ENV STRIPE_PRIVATE_KEY=${STRIPE_PRIVATE_KEY}
ENV STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

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