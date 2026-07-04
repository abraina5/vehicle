$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configHome = Join-Path $repoRoot ".firebase-config"
$cacheHome = Join-Path $repoRoot ".firebase-cache"
$vehicleRuntimeConfigPath = Join-Path $repoRoot "vehicle\runtime-config.local.js"

New-Item -ItemType Directory -Force $configHome | Out-Null
New-Item -ItemType Directory -Force $cacheHome | Out-Null
$env:XDG_CONFIG_HOME = $configHome
$env:XDG_CACHE_HOME = $cacheHome

Write-Host "Using Firebase CLI config in $configHome"
Write-Host "Using Firebase CLI cache in $cacheHome"

if (-not (Get-Command firebase.cmd -ErrorAction SilentlyContinue)) {
  throw "firebase.cmd is not available on PATH. Install Firebase CLI first."
}

$hasJava = [bool](Get-Command java -ErrorAction SilentlyContinue)

if ($hasJava) {
  @'
window.VEHICLE_LOCAL_RUNTIME_CONFIG = {
  useDatabaseEmulator: true,
  useAuthEmulator: true,
};
'@ | Set-Content -Path $vehicleRuntimeConfigPath -Encoding UTF8

  Write-Host "Java detected. Starting local stack: hosting + database + auth."
  & firebase.cmd emulators:start --config (Join-Path $repoRoot "firebase.local.json") --project templecars
  exit $LASTEXITCODE
}

@'
window.VEHICLE_LOCAL_RUNTIME_CONFIG = {
  useDatabaseEmulator: false,
  useAuthEmulator: false,
};
'@ | Set-Content -Path $vehicleRuntimeConfigPath -Encoding UTF8

Write-Host "Java was not found. Starting hybrid local mode instead."
Write-Host "This uses local hosting with live Firebase auth/database."
& firebase.cmd emulators:start --only hosting --config (Join-Path $repoRoot "firebase.hybrid.local.json") --project templecars
