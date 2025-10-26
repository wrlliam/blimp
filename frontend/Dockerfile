# Use the official Bun image (Alpine variant is also available)
FROM oven/bun:latest

WORKDIR /app

# Copy manifest and install (including Next and other dev deps):contentReference[oaicite:8]{index=8}
COPY package.json bun.lockb ./
RUN bun install

# Ensure node_modules/.bin is in PATH so binaries like 'next' are found:contentReference[oaicite:9]{index=9}
ENV PATH /app/node_modules/.bin:$PATH

# Copy the rest of the source code
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Run migrations then start Next dev server, ignoring migration errors
CMD ["sh", "-c", "bun run db:all || true && bun run dev"]
