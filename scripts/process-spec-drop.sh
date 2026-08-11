#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

YAML_DIR="$ROOT_DIR/spec-drop/yaml"
PDF_DIR="$ROOT_DIR/spec-drop/pdf"

mkdir -p "$YAML_DIR" "$PDF_DIR"

shopt -s nullglob
files=("$YAML_DIR"/*.yaml "$YAML_DIR"/*.yml "$YAML_DIR"/*.json)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "[process-spec-drop] No spec files found in $YAML_DIR"
  exit 0
fi

for file in "${files[@]}"; do
  base="$(basename "$file")"
  stem="${base%.*}"
  echo "[process-spec-drop] Processing $base"

  node ./scripts/spec-to-pdf.mjs \
    "$file" \
    "$PDF_DIR/$stem.pdf"
done

echo "[process-spec-drop] Done. YAML source in $YAML_DIR, PDFs in $PDF_DIR"
