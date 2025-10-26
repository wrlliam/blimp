# Use official Bun image as base
# (see all versions at https://hub.docker.com/r/oven/bun/tags)
FROM oven/bun:1
WORKDIR /app

# Copy package files and install dependencies (includes devDeps by default)
COPY package.json bun.lock* ./
RUN bun install

# Copy the rest of the bot source code
COPY . .

# Expose the bot port (3001 as per the app specification)
EXPOSE 3001

# Start the bot in development mode (e.g. with hot reload)
CMD ["bun", "run", "dev"]
