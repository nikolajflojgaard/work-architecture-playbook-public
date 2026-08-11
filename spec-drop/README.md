# Spec drop

Use this folder when you want a simple drop-zone workflow.

## Put YAML here

- `spec-drop/yaml/`

## Generated PDFs appear here

- `spec-drop/pdf/`

Generated files in this folder are ignored by git by default. Checked-in review examples belong under `examples/generated/`.

## Rule

Use the YAML filename as the base name.

Example:
- input: `spec-drop/yaml/sample-api.yaml`
- output: `spec-drop/pdf/sample-api.pdf`

## Run it

### Windows 11 PowerShell

```powershell
.\scripts\process-spec-drop.ps1
```

### macOS / Linux

```bash
./scripts/process-spec-drop.sh
```

With the TDC NET profile:

```bash
SPEC_PROFILE=tdc-net ./scripts/process-spec-drop.sh
```

## Notes

- The script processes `.yaml`, `.yml`, and `.json` files in `spec-drop/yaml/`
- It generates PDFs into `spec-drop/pdf/`
- It does not generate HTML copies
- It does not delete the source YAML
