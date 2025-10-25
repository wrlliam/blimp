# Use official Bun image as base
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy the entire codebase (including root files like drizzle.config.ts)
COPY . .

# Set working directory to bot folder
WORKDIR /app/bot

# Install bot dependencies
RUN bun install --frozen-lockfile

# Expose bot API and WebSocket ports
EXPOSE 3001 3002

# Create an entrypoint script that runs db:all before starting the bot
RUN echo '#!/bin/sh\nset -e\ncd /app/bot\nbun run db:all || echo "Database migration completed or already exists"\nexec bun run dev' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]