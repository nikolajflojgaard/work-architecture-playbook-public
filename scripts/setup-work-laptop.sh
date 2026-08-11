#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[setup-work-laptop] %s\n' "$*"
}

fail() {
  printf '[setup-work-laptop] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

find_chrome() {
  local candidates=(
    "${CHROME_BIN:-}"
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  )

  for candidate in "${candidates[@]}"; do
    [[ -n "$candidate" && -x "$candidate" ]] && {
      printf '%s\n' "$candidate"
      return 0
    }
  done

  return 1
}

require_cmd node
require_cmd npm

log "Installing npm dependencies"
npm install

if CHROME_PATH="$(find_chrome)"; then
  log "Found browser for PDF generation: $CHROME_PATH"
else
  fail "No Chrome/Chromium browser found. Install Google Chrome or set CHROME_BIN."
fi

log "Running smoke test"
CHROME_BIN="$CHROME_PATH" npm run test:spec-pdf

cat <<EOF

[setup-work-laptop] Ready.

Next commands:

  cd "$ROOT_DIR"
  CHROME_BIN="$CHROME_PATH" ./scripts/run-api-spec.sh ./examples/sample-api.yaml ./output/sample-api.pdf

EOF
