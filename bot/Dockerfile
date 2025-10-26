# Use the official Bun image as the base (from Oven):contentReference[oaicite:5]{index=5}
FROM oven/bun:latest

WORKDIR /app

# Copy manifest files and install all deps (incl. devDependencies):contentReference[oaicite:6]{index=6}
COPY package.json bun.lockb ./
RUN bun install

# Copy application source code
COPY . .

# Expose the API port
EXPOSE 3001

# On container start, run migrations then start the server.
# The '|| true' ensures errors in db:all do not stop the app.
CMD ["sh", "-c", "bun run db:all || true && bun run dev"]
