# Use official Bun image as base
FROM oven/bun:1 AS base

# Set working directory
WORKDIR /app

# Copy package files from root
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the entire codebase (including root files like drizzle.config.ts)
COPY . .

# Set working directory to bot folder for execution
WORKDIR /app/bot

# Install bot-specific dependencies if bot has its own package.json
RUN if [ -f package.json ]; then bun install --frozen-lockfile; fi

# Go back to root for execution
WORKDIR /app

# Expose port if needed (adjust as necessary)
EXPOSE 3000

# Create an entrypoint script that runs db:all before starting the bot
RUN echo '#!/bin/sh\nbun run db:all\ncd /app/bot\nbun run start' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]