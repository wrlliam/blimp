# Use official Bun image as base
FROM oven/bun:1
WORKDIR /app

# Install Next.js app dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy the Next.js app code
COPY . .

# Expose the Next.js dev server port (default 3000)
EXPOSE 3000

# Start the Next.js development server with Bun
CMD ["bun", "run", "dev"]
