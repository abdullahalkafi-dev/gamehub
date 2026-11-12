#!/usr/bin/env bash
# Run ON THE SERVER inside the repo folder (/opt/gamehub): pulls the approved commit and rebuilds.
# Usage: scripts/deploy.sh [git-ref]   (default: origin/main)
set -euo pipefail
REF="${1:-origin/main}"
git fetch --quiet origin
git checkout --quiet --detach "$REF"
echo "Deploying $(git rev-parse --short HEAD)"
docker compose up -d --build
docker image prune -f >/dev/null
sleep 6
curl -fsS http://127.0.0.1:4110/health && echo " api ok"
curl -fsS -o /dev/null http://127.0.0.1:3110/login && echo "web ok"
echo "$(date -u +%FT%TZ) $(git rev-parse HEAD)" >> deployed.log
