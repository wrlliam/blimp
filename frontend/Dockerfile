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