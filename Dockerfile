# Multi-stage Dockerfile for Blimp Discord Bot with Web Dashboard
# Builds and runs both bot and frontend from parent directory

FROM oven/bun:1 AS base
WORKDIR /app

# ================================
# Stage 1: Install bot dependencies
# ================================
FROM base AS bot-deps
WORKDIR /app/bot
COPY bot/package.json bot/bun.lockb* ./
RUN bun install --frozen-lockfile

# ================================
# Stage 2: Install frontend dependencies  
# ================================
FROM base AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lockb* ./
RUN bun install --frozen-lockfile

# ================================
# Stage 3: Build frontend
# ================================
FROM base AS frontend-builder
WORKDIR /app/frontend
COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY frontend/ ./

# Run database migrations if needed
RUN bun run db:all || true

# Build Next.js app
RUN bun run build

# ================================
# Stage 4: Production runtime
# ================================
FROM base AS runner
WORKDIR /app

# Copy bot dependencies and source
WORKDIR /app/bot
COPY --from=bot-deps /app/bot/node_modules ./node_modules
COPY bot/ ./

# Copy frontend dependencies and build
WORKDIR /app/frontend
COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/public ./public
COPY frontend/ ./

# Copy any shared config files if they exist
WORKDIR /app
COPY package.json* ./

# Create startup script to run both services with bun directly
RUN echo '#!/usr/bin/env bun\n\
import { spawn } from "bun";\n\
\n\
console.log("🚀 Starting Blimp services...");\n\
\n\
// Start bot\n\
console.log("📡 Starting Discord bot...");\n\
const bot = spawn(["bun", "run", "./src/index.ts"], {\n\
  cwd: "/app/bot",\n\
  stdout: "inherit",\n\
  stderr: "inherit",\n\
  env: { ...process.env }\n\
});\n\
\n\
bot.exited.then((code) => {\n\
  console.error(`❌ Bot exited with code ${code}`);\n\
  process.exit(code);\n\
}).catch((err) => {\n\
  console.error("❌ Bot error:", err);\n\
  process.exit(1);\n\
});\n\
\n\
// Start frontend\n\
console.log("🌐 Starting frontend...");\n\
const frontend = spawn(["bun", "run", "dev"], {\n\
  cwd: "/app/frontend",\n\
  stdout: "inherit",\n\
  stderr: "inherit",\n\
  env: { ...process.env, PORT: "3000", HOSTNAME: "0.0.0.0" }\n\
});\n\
\n\
frontend.exited.then((code) => {\n\
  console.error(`❌ Frontend exited with code ${code}`);\n\
  process.exit(code);\n\
}).catch((err) => {\n\
  console.error("❌ Frontend error:", err);\n\
  process.exit(1);\n\
});\n\
\n\
// Handle exit\n\
process.on("SIGTERM", () => {\n\
  console.log("🛑 Shutting down...");\n\
  bot.kill();\n\
  frontend.kill();\n\
  process.exit(0);\n\
});\n\
\n\
process.on("SIGINT", () => {\n\
  console.log("🛑 Shutting down...");\n\
  bot.kill();\n\
  frontend.kill();\n\
  process.exit(0);\n\
});\n\
\n\
console.log("✅ All services started");\n\
' > /app/start.ts

# Expose ports
# 3000 for frontend, 3001 for bot API
EXPOSE 3000 3001

# Set environment variables
# ENV NODE_ENV=production
# ENV PORT=3000
# ENV HOSTNAME=0.0.0.0

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD bun --version || exit 1

# Start both services using bun
CMD ["bun", "run", "/app/start.ts"]