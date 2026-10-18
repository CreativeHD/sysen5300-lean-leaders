#!/bin/bash
# Start the CivicWatch API locally (instructor's four-script contract).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
python -m uvicorn app:app --host 0.0.0.0 --port 8000
