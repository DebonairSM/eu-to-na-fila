#!/usr/bin/env bash
# Render start entrypoint: ensure we run from repo root, then migrate and start API.
# Usage: bash scripts/start-render.sh (or sh scripts/start-render.sh)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm db:migrate
exec node scripts/start-api.js
