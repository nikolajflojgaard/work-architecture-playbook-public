$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

if ($args.Count -lt 2) {
  @"
Usage:
  .\scripts\run-api-spec.ps1 <input.yaml> <output.pdf> [extra renderer args...]

Example:
  .\scripts\run-api-spec.ps1 `
    .\examples\sample-api.yaml `
    .\output\sample-api.pdf `
    --profile tdc-net `
    --title "Sample API" `
    --subtitle "API Specification" `
    --system "Sample Platform" `
    --version "v1.0"
"@ | Write-Host
  exit 1
}

$InputPath = $args[0]
$OutputPath = $args[1]
$ExtraArgs = @()
if ($args.Count -gt 2) {
  $ExtraArgs = $args[2..($args.Count - 1)]
}

& node .\scripts\spec-to-pdf.mjs @ExtraArgs $InputPath $OutputPath
