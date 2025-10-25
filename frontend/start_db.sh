#!/usr/bin/env bash
# start_pg.sh
# Starts a Postgres DB on macOS using Docker (preferred).
# Creates user "Postgres" and a random password, then prints the password and full connection URL with colors.

set -o pipefail

# ---------- Colors ----------
ESC=$(printf '\033')
RESET="${ESC}[0m"
BOLD="${ESC}[1m"
GREEN="${ESC}[32m"
YELLOW="${ESC}[33m"
CYAN="${ESC}[36m"
MAGENTA="${ESC}[35m"
WHITE_ON_BLUE="${ESC}[37;44m"

# ---------- Helpers ----------
err() { printf "${BOLD}${ESC}[31m[ERROR]${RESET} %s\n" "$*" >&2; }
info() { printf "${CYAN}%s${RESET}\n" "$*"; }
note() { printf "${YELLOW}%s${RESET}\n" "$*"; }
ok() { printf "${GREEN}%s${RESET}\n" "$*"; }

random_password() {
  # generate an alphanumeric password (length 20)
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 30 | tr -dc 'A-Za-z0-9' | cut -c1-20
  else
    # fallback: use /dev/urandom
    tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 20 || echo "p@ssw0rd12345"
  fi
}

find_free_port() {
  # check common Postgres ports 5432..5452
  for p in $(seq 5432 5452); do
    if ! nc -z -w1 127.0.0.1 "$p" 2>/dev/null; then
      echo "$p"
      return 0
    fi
  done
  # if none free, ask system for a free port via Python if available
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import socket
s=socket.socket()
s.bind(('',0))
print(s.getsockname()[1])
s.close()
PY
    return 0
  fi
  # last resort
  echo "5432"
}

# ---------- Main ----------
if ! command -v docker >/dev/null 2>&1; then
  err "Docker not found."
  note "This script prefers Docker. Install Docker Desktop for macOS:"
  printf "  • %s\n\n" "https://www.docker.com/get-started"
  printf "%s\n" "Or install PostgreSQL via Homebrew:  brew install postgresql"
  exit 1
fi

# Check docker daemon
if ! docker info >/dev/null 2>&1; then
  err "Docker appears to be installed but the daemon is not running or you lack permission."
  note "Start Docker Desktop and try again."
  exit 1
fi

PASSWORD="$(random_password)"
DB_USER="Postgres"
DB_NAME="postgres"
HOST_PORT="$(find_free_port)"
CONTAINER_NAME="pg_${DB_USER}_$(date +%s)"

IMAGE="postgres:latest"

printf "\n${WHITE_ON_BLUE}  PostgreSQL quick launcher  ${RESET}\n\n"

note "Generating credentials..."
sleep 0.2

printf "${BOLD}User:${RESET} %s\n" "$DB_USER"
printf "${BOLD}Password:${RESET} %s\n" "$PASSWORD"
printf "${BOLD}Database:${RESET} %s\n" "$DB_NAME"
printf "${BOLD}Host port:${RESET} %s\n\n" "$HOST_PORT"

info "Pulling image (if needed) and starting container..."
# Pull image in background to make sure it's available
docker pull "$IMAGE" >/dev/null 2>&1 || true

# Run the container
docker run -d --rm \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$PASSWORD" \
  -e POSTGRES_DB="$DB_NAME" \
  -p "${HOST_PORT}":5432 \
  "$IMAGE" >/dev/null

if [ $? -ne 0 ]; then
  err "docker run failed. Maybe port ${HOST_PORT} is in use or Docker couldn't start the image."
  exit 1
fi

# Wait for Postgres to be ready (timeout ~30s)
info "Waiting for PostgreSQL to become available (this can take a few seconds)..."
READY=0
for i in $(seq 1 30); do
  # use docker exec pg_isready if available
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ $READY -ne 1 ]; then
  note "Timed out waiting for postgres readiness. Showing last 20 container log lines:"
  docker logs --tail 20 "$CONTAINER_NAME"
  err "Postgres didn't signal ready in time. You can inspect logs with: docker logs $CONTAINER_NAME"
  exit 1
fi

# Build connection URL
CONNECTION_URL="postgresql://${DB_USER}:${PASSWORD}@localhost:${HOST_PORT}/${DB_NAME}"

# Pretty output box
printf "\n${MAGENTA}┌───────────────────────────────────────────────────────────┐${RESET}\n"
printf "${MAGENTA}│${RESET} %-57s ${MAGENTA}│${RESET}\n" "${BOLD}PostgreSQL is ready!${RESET}"
printf "${MAGENTA}├───────────────────────────────────────────────────────────┤${RESET}\n"
printf "${MAGENTA}│${RESET} ${BOLD}Container:${RESET} %-44s ${MAGENTA}│${RESET}\n" "$CONTAINER_NAME"
printf "${MAGENTA}│${RESET} ${BOLD}Port:${RESET}      %-44s ${MAGENTA}│${RESET}\n" "localhost:${HOST_PORT}"
printf "${MAGENTA}│${RESET} ${BOLD}User:${RESET}      %-44s ${MAGENTA}│${RESET}\n" "$DB_USER"
printf "${MAGENTA}│${RESET} ${BOLD}Password:${RESET}  %-44s ${MAGENTA}│${RESET}\n" "$PASSWORD"
printf "${MAGENTA}│${RESET} ${BOLD}Database:${RESET}  %-44s ${MAGENTA}│${RESET}\n" "$DB_NAME"
printf "${MAGENTA}├───────────────────────────────────────────────────────────┤${RESET}\n"
printf "${MAGENTA}│${RESET} ${BOLD}Connection URL:${RESET} %-37s ${MAGENTA}│${RESET}\n" ""
printf "${MAGENTA}│${RESET} %-59s ${MAGENTA}│${RESET}\n" "$CONNECTION_URL"
printf "${MAGENTA}└───────────────────────────────────────────────────────────┘${RESET}\n\n"

ok "Quick use examples:"
printf "  • psql (if installed locally): %s\n" "PGPASSWORD=\"$PASSWORD\" psql -h localhost -p $HOST_PORT -U $DB_USER -d $DB_NAME"
printf "  • Environment variable: %s\n" "export DATABASE_URL=\"$CONNECTION_URL\""
printf "\n"

note "To stop & remove the running container:"
printf "  docker stop %s\n\n" "$CONTAINER_NAME"

ok "Have fun! 🎉"
