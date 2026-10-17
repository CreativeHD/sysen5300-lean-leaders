#!/bin/bash
# Generate the Posit Connect FastAPI deployment manifest.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
python -m pip install rsconnect-python
rsconnect write-manifest fastapi . --entrypoint app:app
