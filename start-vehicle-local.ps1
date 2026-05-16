$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configHome = Join-Path $repoRoot ".firebase-config"
$cacheHome = Join-Path $repoRoot ".firebase-cache"
$functionsDir = Join-Path $repoRoot "functions"
$functionsNodeModules = Join-Path $functionsDir "node_modules"
$functionsLocalEnvPath = Join-Path $functionsDir ".env.local"
$vehicleRuntimeConfigPath = Join-Path $repoRoot "vehicle\runtime-config.local.js"

New-Item -ItemType Directory -Force $configHome | Out-Null
New-Item -ItemType Directory -Force $cacheHome | Out-Null
$env:XDG_CONFIG_HOME = $configHome
$env:XDG_CACHE_HOME = $cacheHome

Write-Host "Using Firebase CLI config in $configHome"
Write-Host "Using Firebase CLI cache in $cacheHome"

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "npm.cmd is not available on PATH. Install Node.js first."
}

if (-not (Get-Command firebase.cmd -ErrorAction SilentlyContinue)) {
  throw "firebase.cmd is not available on PATH. Install Firebase CLI first."
}

if (-not (Test-Path $functionsNodeModules)) {
  Write-Host "Installing functions dependencies..."
  & npm.cmd install --prefix $functionsDir
}

if (Test-Path $functionsLocalEnvPath) {
  Write-Host "Loading local Functions environment from $functionsLocalEnvPath"
  Get-Content $functionsLocalEnvPath | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $name, $value = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
  }
}

$hasJava = [bool](Get-Command java -ErrorAction SilentlyContinue)

if ($hasJava) {
  @'
window.VEHICLE_LOCAL_RUNTIME_CONFIG = {
  useFunctionsEmulator: true,
  useDatabaseEmulator: true,
  useAuthEmulator: true,
};
'@ | Set-Content -Path $vehicleRuntimeConfigPath -Encoding UTF8

  Write-Host "Java detected. Starting full local stack: hosting + functions + database + auth."
  & firebase.cmd emulators:start --config (Join-Path $repoRoot "firebase.local.json") --project templecars
  exit $LASTEXITCODE
}

@'
window.VEHICLE_LOCAL_RUNTIME_CONFIG = {
  useFunctionsEmulator: true,
  useDatabaseEmulator: false,
  useAuthEmulator: false,
};
'@ | Set-Content -Path $vehicleRuntimeConfigPath -Encoding UTF8

Write-Host "Java was not found. Starting hybrid local mode instead."
Write-Host "This uses local hosting + local message function, with live Firebase auth/database."
& firebase.cmd emulators:start --only hosting,functions --config (Join-Path $repoRoot "firebase.hybrid.local.json") --project templecars
