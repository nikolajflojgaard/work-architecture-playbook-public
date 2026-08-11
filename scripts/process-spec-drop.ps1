$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

$YamlDir = Join-Path $RootDir 'spec-drop\yaml'
$PdfDir = Join-Path $RootDir 'spec-drop\pdf'

New-Item -ItemType Directory -Force -Path $YamlDir | Out-Null
New-Item -ItemType Directory -Force -Path $PdfDir | Out-Null

$Files = Get-ChildItem -Path $YamlDir -File -Include *.yaml, *.yml, *.json
$RendererArgs = @()

if ($env:SPEC_PROFILE) {
  $RendererArgs += @('--profile', $env:SPEC_PROFILE)
}
if ($env:SPEC_LOGO_PATH) {
  $RendererArgs += @('--logo-path', $env:SPEC_LOGO_PATH)
}
if ($env:SPEC_BRAND_NAME) {
  $RendererArgs += @('--brand-name', $env:SPEC_BRAND_NAME)
}
if ($env:SPEC_SYSTEM) {
  $RendererArgs += @('--system', $env:SPEC_SYSTEM)
}

if (-not $Files) {
  Write-Host "[process-spec-drop] No spec files found in $YamlDir"
  exit 0
}

foreach ($File in $Files) {
  $Stem = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
  Write-Host "[process-spec-drop] Processing $($File.Name)"

  & node .\scripts\spec-to-pdf.mjs `
    @RendererArgs `
    $File.FullName `
    (Join-Path $PdfDir "$Stem.pdf")
}

Write-Host "[process-spec-drop] Done. YAML source in $YamlDir, PDFs in $PdfDir"
