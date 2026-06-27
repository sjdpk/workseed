#!/usr/bin/env bash
# Workseed setup: fresh clone to a running, seeded database in one command.
# Usage: npm run setup
set -euo pipefail

cd "$(dirname "$0")/.."

info() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$1"; }
die()  { printf '\033[1;31mx\033[0m %s\n' "$1" >&2; exit 1; }

# Prerequisites
command -v node >/dev/null 2>&1 || die "Node.js not found. Install Node 20+ first."
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || die "Node 20+ required (found $(node -v))."
command -v psql >/dev/null 2>&1 || die "psql not found. Install PostgreSQL client tools first."

# Env file — create it, and auto-generate a JWT secret if blank
if [ ! -f .env ]; then
  info "Creating .env from .env.example"
  cp .env.example .env
fi
if grep -qE '^JWT_SECRET=$' .env; then
  info "Generating JWT_SECRET"
  SECRET="$(node -e 'console.log(require("crypto").randomBytes(36).toString("base64"))')"
  tmp="$(mktemp)"
  awk -v s="$SECRET" '/^JWT_SECRET=$/{print "JWT_SECRET="s; next} {print}' .env > "$tmp" && mv "$tmp" .env
fi

# Read a key from .env without sourcing (safe for values with spaces)
get_env() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- || true; }
DATABASE_URL="$(get_env DATABASE_URL)"
DB_HOST="$(get_env DB_HOST)";     DB_HOST="${DB_HOST:-localhost}"
DB_PORT="$(get_env DB_PORT)";     DB_PORT="${DB_PORT:-5432}"
DB_USER="$(get_env DB_USER)";     DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="$(get_env DB_PASSWORD)"
DB_NAME="$(get_env DB_NAME)";     DB_NAME="${DB_NAME:-workseed}"

info "Installing dependencies"
npm install

# Create the database if it doesn't exist (skipped when a full DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
  warn "DATABASE_URL is set — skipping local CREATE DATABASE (managed DB assumed)."
else
  info "Ensuring database '$DB_NAME' exists on $DB_HOST:$DB_PORT"
  export PGPASSWORD="$DB_PASSWORD"
  if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc \
       "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    echo "  Already exists."
  else
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\"" \
      && echo "  Created."
  fi
fi

info "Generating Prisma client"
npm run db:generate

info "Applying migrations"
npm run db:deploy

info "Seeding base data"
npm run db:seed

info "Done. Start the app: npm run dev"
