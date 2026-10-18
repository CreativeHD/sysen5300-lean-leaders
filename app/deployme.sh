#!/bin/bash
# Deploy to the course Posit Connect server with configured credentials.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
python -m pip install rsconnect-python
if [ -f ".env" ]; then
  # shellcheck disable=SC1091
  source .env
fi
rsconnect deploy fastapi \
  ${CONNECT_SERVER:+--server "$CONNECT_SERVER"} \
  ${CONNECT_API_KEY:+--api-key "$CONNECT_API_KEY"} \
  --entrypoint app:app \
  --exclude ".env" --exclude ".env.*" --exclude ".venv" \
  .
