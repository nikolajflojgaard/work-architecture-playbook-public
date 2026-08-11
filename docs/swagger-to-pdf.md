# Swagger / OpenAPI YAML to API Specification PDF

This repo includes a default path for turning a Swagger/OpenAPI YAML file into a polished PDF.

## Why

A YAML file is correct, but it is not always the best review artifact.
A PDF is easier to:
- share with stakeholders
- attach to approvals
- review offline
- preserve as a formal design artifact

## Default approach

1. Render the OpenAPI YAML to static HTML using Redocly
2. Add a cover/title page wrapper
3. Print the final HTML to PDF using headless Google Chrome

This gives a readable API specification without hand-formatting a separate PDF.

## Command

```bash
npm run spec:pdf -- ./examples/sample-api.yaml ./output/sample-api.pdf
```

Simple wrapper for laptop use:

```bash
./scripts/run-api-spec.sh ./examples/sample-api.yaml ./output/sample-api.pdf
```

With explicit cover-page metadata:

```bash
node scripts/spec-to-pdf.mjs \
  --title "Customer Address API" \
  --subtitle "API Specification" \
  --system "Customer Platform" \
  --version "v1.0" \
  ./examples/sample-api.yaml \
  ./output/sample-api.pdf
```

With the optional TDC NET profile:

```bash
node scripts/spec-to-pdf.mjs \
  --profile tdc-net \
  --title "Order Cache API" \
  --subtitle "API Specification" \
  ./spec-drop/yaml/net-ordercache.yaml \
  ./spec-drop/pdf/net-ordercache.pdf
```

For the drop-folder script, set environment variables:

```bash
SPEC_PROFILE=tdc-net ./scripts/process-spec-drop.sh
```

The profile is visible in `profiles/tdc-net.json`, and the matching reusable YAML/front-matter template is `templates/tdc-net-api-spec-template.yaml`.

## What it does

- reads an OpenAPI YAML/JSON file
- builds a Redoc HTML page
- prepends a clean title page
- prepends structured front-matter pages such as TOC, change log, overview, interaction, specific API, and attachments by default
- still allows an explicit `x-document` block in the YAML to override that generated front matter
- prints it to a PDF file

## Requirements

- Node.js
- npm dependencies from this repo
- Google Chrome installed locally

## New laptop setup

Use:

```bash
./scripts/setup-work-laptop.sh
```

It will:
- install npm dependencies
- verify Chrome/Chromium is available
- run a smoke test PDF build

On Windows 11 use:

```powershell
.\scripts\setup-work-laptop.ps1
```

And run generation with:

```powershell
.\scripts\run-api-spec.ps1 .\examples\sample-api.yaml .\output\sample-api.pdf
```

## Notes

- This is for human-readable API documentation, not contract generation
- The YAML remains the technical source of truth
- The PDF is a presentation/review artifact

## Output policy

Generate PDFs when:
- stakeholders need a reviewable artifact
- approval flow benefits from a PDF
- documentation should be archived in a human-readable form

Do not generate PDFs just because you can.
If the YAML alone is enough, keep it lean.
