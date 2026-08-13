# OpenAPI Spec Drop

Public, generic version of the architecture playbook's OpenAPI-to-PDF workflow.

This repo is intentionally small:

- place OpenAPI YAML/JSON files in `spec-drop/yaml/`
- run the drop-folder script
- get generated PDFs in `spec-drop/pdf/`

It does not include private working documents, external-file automation, company-specific examples, generated customer artifacts, or branded assets.

## Quick Start

Install dependencies:

```bash
npm install
```

Generate a sample PDF:

```bash
npm run spec:pdf -- ./examples/sample-api.yaml ./output/sample-api.pdf
```

Use the drop folder:

```bash
cp ./examples/sample-api.yaml ./spec-drop/yaml/sample-api.yaml
./scripts/process-spec-drop.sh
```

On Windows PowerShell:

```powershell
Copy-Item .\examples\sample-api.yaml .\spec-drop\yaml\sample-api.yaml
.\scripts\process-spec-drop.ps1
```

## Folder Layout

- `examples/` - generic sample OpenAPI files
- `examples/generated/` - checked-in example PDFs for quick GitHub review
- `spec-drop/yaml/` - put input specs here
- `spec-drop/pdf/` - generated PDFs land here and are ignored by git by default
- `scripts/` - renderer and helper scripts
- `profiles/` - optional rendering profiles such as `tdc-net`
- `assets/` - optional logo/brand assets used by profiles
- `templates/` - lightweight architecture/API design templates

## Direct Commands

Generate PDF:

```bash
./scripts/run-api-spec.sh ./examples/sample-api.yaml ./output/sample-api.pdf
```

Generate PDF with cover metadata:

```bash
./scripts/run-api-spec.sh \
  ./examples/sample-api.yaml \
  ./output/sample-api.pdf \
  --title "Sample API" \
  --subtitle "API Specification" \
  --system "Sample Platform" \
  --version "v1.0"
```

Use the optional TDC NET profile:

```bash
SPEC_PROFILE=tdc-net ./scripts/process-spec-drop.sh
```

The profile uses:

- `profiles/tdc-net.json` for TDC NET metadata and front-matter text
- `assets/tdc-net-logo.png` for the cover logo
- `templates/tdc-net-api-spec-template.yaml` as a visible YAML/front-matter template

The checked-in generated Net OrderCache example is:

- `examples/generated/net-ordercache.pdf`

Generate HTML:

```bash
npm run spec:html -- ./examples/sample-api.yaml ./output/sample-api.html
```

Generate with the full raw schema appendix:

```bash
npm run spec:pdf -- --full-schema ./spec-drop/yaml/net-ordercache.yaml ./output/net-ordercache-full-schema.pdf
```

## Generated Schema Section

Generated PDFs include section `6 Schema` when the OpenAPI file has `components.schemas`.

The default schema section mirrors OpenAPI `components.schemas` directly:

- one subsection per component schema
- one table per schema
- columns for field, type, required, example, and description
- table of contents entries point to each schema subsection

The `--full-schema` flag is retained for compatibility; schema rendering is direct by default.

## Requirements

- Node.js
- npm
- Google Chrome, Microsoft Edge, or Chromium for PDF generation

Set `CHROME_BIN` if the renderer cannot find your browser automatically.

## Public-Safe Scope

This repo is meant to be reusable scaffolding. Keep internal folder IDs, credentials, generated production PDFs, and sensitive organization-specific process notes out of it.
