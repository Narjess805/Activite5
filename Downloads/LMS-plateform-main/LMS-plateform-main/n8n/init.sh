#!/bin/sh
# =============================================================================
# n8n Init Script — LMS Platform
#
# Runs before n8n starts to:
#   1. Wait for the PostgreSQL database to be ready.
#   2. Import all workflow JSON files from /workflows into n8n.
#   3. Hand off to the n8n server process.
# =============================================================================

echo "[n8n-init] Waiting for PostgreSQL at ${DB_POSTGRESDB_HOST:-postgres}:${DB_POSTGRESDB_PORT:-5432}..."

RETRIES=30
check_postgres() {
  node -e "const net = require('net'); const host = process.env.DB_POSTGRESDB_HOST || 'postgres'; const port = Number(process.env.DB_POSTGRESDB_PORT || 5432); const socket = net.createConnection({ host, port }, () => { socket.end(); process.exit(0); }); socket.setTimeout(1500, () => { socket.destroy(); process.exit(1); }); socket.on('error', () => process.exit(1));"
}

until check_postgres; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "[n8n-init] ERROR: PostgreSQL not reachable after 60 s. Continuing anyway..."
    break
  fi
  echo "[n8n-init] PostgreSQL not ready yet — retrying in 2 s ($RETRIES attempts left)..."
  sleep 2
done

echo "[n8n-init] PostgreSQL is up."

if [ -d "/workflows" ] && ls /workflows/*.json >/dev/null 2>&1; then
  echo "[n8n-init] Importing LMS workflows from /workflows/ ..."
  n8n import:workflow --separate --input=/workflows/ || echo "[n8n-init] WARNING: Workflow import failed — continuing."
else
  echo "[n8n-init] No workflows directory found — skipping import."
fi

echo "[n8n-init] Starting n8n..."
exec n8n start
