$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

function Log([string]$Message) {
  Write-Host "[setup-work-laptop] $Message"
}

function Fail([string]$Message) {
  throw "[setup-work-laptop] ERROR: $Message"
}

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Fail "Missing required command: $Name"
  }
}

function Find-Browser {
  $Candidates = @(
    $env:CHROME_BIN,
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($Candidates.Count -gt 0) {
    return $Candidates[0]
  }

  return $null
}

Require-Command node
Require-Command npm

Log "Installing npm dependencies"
npm install

$BrowserPath = Find-Browser
if (-not $BrowserPath) {
  Fail "No Chrome/Edge browser found. Install Google Chrome or Microsoft Edge, or set CHROME_BIN."
}

Log "Found browser for PDF generation: $BrowserPath"
Log "Running smoke test"
$env:CHROME_BIN = $BrowserPath
npm run test:spec-pdf

Write-Host ""
Write-Host "[setup-work-laptop] Ready."
Write-Host ""
Write-Host "Next commands:"
Write-Host ""
Write-Host "  Set-Location '$RootDir'"
Write-Host "  `$env:CHROME_BIN = '$BrowserPath'"
Write-Host "  .\scripts\run-api-spec.ps1 .\examples\sample-api.yaml .\output\sample-api.pdf"
Write-Host ""
