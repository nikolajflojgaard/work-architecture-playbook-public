#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ $# -lt 2 ]]; then
  cat <<'EOF'
Usage:
  ./scripts/run-api-spec.sh <input.yaml> <output.pdf> [extra renderer args...]

Example:
  ./scripts/run-api-spec.sh \
    ./examples/sample-api.yaml \
    ./output/sample-api.pdf \
    --profile tdc-net \
    --title "Sample API" \
    --subtitle "API Specification" \
    --system "Sample Platform" \
    --version "v1.0"
EOF
  exit 1
fi

INPUT_PATH="$1"
OUTPUT_PATH="$2"
shift 2

node ./scripts/spec-to-pdf.mjs "$@" "$INPUT_PATH" "$OUTPUT_PATH"
