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

# Go back to root to run database initialization
WORKDIR /app

# Run database initialization
RUN bun run db:all

# Set working directory back to bot for running the application
WORKDIR /app/bot

# Expose port if needed (adjust as necessary)
EXPOSE 3000

# Start the bot
CMD ["bun", "run", "dev"]