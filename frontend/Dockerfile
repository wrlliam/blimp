# Stage 1: install deps
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install 

# Stage 2: build app
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run migrations (if frontend uses Drizzle too)
RUN bun run db:all || true
# Build Next.js app (outputs .next/standalone and static)
RUN bun run build

# Stage 3: runtime image
FROM oven/bun:1 AS runner
WORKDIR /app

# Use non-root user for security (Next.js image adds a 'bun' user)

# Copy public files and built output
COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:bun .next
COPY --from=builder --chown=nextjs:bun /app/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Finally run the server
CMD ["bun", "server.js"]
