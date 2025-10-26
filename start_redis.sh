#!/usr/bin/env bash
# start_redis.sh
# Starts a Redis server on macOS using Docker (preferred).
# Generates a random password, prints the password and connection details with colors.

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
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 30 | tr -dc 'A-Za-z0-9' | cut -c1-20
  else
    tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 20 || echo "redis12345"
  fi
}

find_free_port() {
  for p in $(seq 6379 6400); do
    if ! nc -z -w1 127.0.0.1 "$p" 2>/dev/null; then
      echo "$p"
      return 0
    fi
  done
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
  echo "6379"
}

# ---------- Main ----------
if ! command -v docker >/dev/null 2>&1; then
  err "Docker not found."
  note "Install Docker Desktop for macOS:"
  printf "  • %s\n\n" "https://www.docker.com/get-started"
  printf "%s\n" "Or install Redis via Homebrew:  brew install redis"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  err "Docker is installed but the daemon is not running or permission is denied."
  note "Start Docker Desktop and try again."
  exit 1
fi

PASSWORD="$(random_password)"
HOST_PORT="$(find_free_port)"
CONTAINER_NAME="redis_$(date +%s)"
IMAGE="redis:latest"

printf "\n${WHITE_ON_BLUE}  Redis quick launcher  ${RESET}\n\n"

note "Generating credentials..."
sleep 0.2

printf "${BOLD}Password:${RESET} %s\n" "$PASSWORD"
printf "${BOLD}Host port:${RESET} %s\n\n" "$HOST_PORT"

info "Pulling image (if needed) and starting container..."
docker pull "$IMAGE" >/dev/null 2>&1 || true

docker run -d --rm \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}":6379 \
  "$IMAGE" \
  redis-server --requirepass "$PASSWORD" >/dev/null

if [ $? -ne 0 ]; then
  err "docker run failed. Maybe port ${HOST_PORT} is in use or Docker couldn't start the image."
  exit 1
fi

# Wait for Redis to be ready
info "Waiting for Redis to become available..."
READY=0
for i in $(seq 1 20); do
  if docker exec "$CONTAINER_NAME" redis-cli -a "$PASSWORD" ping >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ $READY -ne 1 ]; then
  note "Timed out waiting for Redis readiness. Showing last 20 container log lines:"
  docker logs --tail 20 "$CONTAINER_NAME"
  err "Redis didn't signal ready in time. You can inspect logs with: docker logs $CONTAINER_NAME"
  exit 1
fi

CONNECTION_URL="redis://default:${PASSWORD}@localhost:${HOST_PORT}"

printf "\n${MAGENTA}┌───────────────────────────────────────────────────────────┐${RESET}\n"
printf "${MAGENTA}│${RESET} %-57s ${MAGENTA}│${RESET}\n" "${BOLD}Redis is ready!${RESET}"
printf "${MAGENTA}├───────────────────────────────────────────────────────────┤${RESET}\n"
printf "${MAGENTA}│${RESET} ${BOLD}Container:${RESET} %-44s ${MAGENTA}│${RESET}\n" "$CONTAINER_NAME"
printf "${MAGENTA}│${RESET} ${BOLD}Port:${RESET}      %-44s ${MAGENTA}│${RESET}\n" "localhost:${HOST_PORT}"
printf "${MAGENTA}│${RESET} ${BOLD}Password:${RESET}  %-44s ${MAGENTA}│${RESET}\n" "$PASSWORD"
printf "${MAGENTA}├───────────────────────────────────────────────────────────┤${RESET}\n"
printf "${MAGENTA}│${RESET} ${BOLD}Connection URL:${RESET} %-37s ${MAGENTA}│${RESET}\n" ""
printf "${MAGENTA}│${RESET} %-59s ${MAGENTA}│${RESET}\n" "$CONNECTION_URL"
printf "${MAGENTA}└───────────────────────────────────────────────────────────┘${RESET}\n\n"

ok "Quick use examples:"
printf "  • redis-cli: %s\n" "redis-cli -a \"$PASSWORD\" -p $HOST_PORT"
printf "  • Node.js / TypeScript (ioredis): %s\n" "new Redis('$CONNECTION_URL')"
printf "  • Env var: %s\n" "export REDIS_URL=\"$CONNECTION_URL\""
printf "\n"

note "To stop & remove the running container:"
printf "  docker stop %s\n\n" "$CONTAINER_NAME"

ok "Have fun! 🎉"
