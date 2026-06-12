param()

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releaseDir = Join-Path $root "release"
$installer = Join-Path $releaseDir "video_tool Setup 0.1.0.exe"
$unpackedDir = Join-Path $releaseDir "win-unpacked"
$installDir = Join-Path $releaseDir "install-check"
$pathCheckDir = Join-Path $releaseDir "路径 检查"
$distIndex = Join-Path $root "dist\index.html"

if (-not (Test-Path $distIndex)) {
  throw "dist index not found: $distIndex"
}

$distHtml = Get-Content -LiteralPath $distIndex -Raw
if ($distHtml -match 'src="/assets/' -or $distHtml -match 'href="/assets/') {
  throw "dist index uses absolute /assets paths and will white-screen with loadFile"
}
if ($distHtml -notmatch 'src="\./assets/' -or $distHtml -notmatch 'href="\./assets/') {
  throw "dist index does not use relative ./assets paths"
}

if (-not (Test-Path $installer)) {
  throw "Installer not found: $installer"
}

if (Test-Path $installDir) {
  Remove-Item -LiteralPath $installDir -Recurse -Force
}

$installProcess = Start-Process -FilePath $installer -ArgumentList @("/S", "/D=$installDir") -PassThru -Wait
if ($installProcess.ExitCode -ne 0) {
  throw "Installer failed with exit code $($installProcess.ExitCode)"
}

$installedExe = Join-Path $installDir "video_tool.exe"
if (-not (Test-Path $installedExe)) {
  throw "Installed app executable not found: $installedExe"
}

foreach ($name in @("yt-dlp.exe", "ffmpeg.exe", "ffprobe.exe")) {
  $binaryPath = Join-Path $installDir "resources\bin\$name"
  if (-not (Test-Path $binaryPath)) {
    throw "Installed binary missing: $binaryPath"
  }
}

$installedIcon = Join-Path $installDir "resources\icon.ico"
if (-not (Test-Path $installedIcon)) {
  throw "Installed app icon missing: $installedIcon"
}

$appProcess = Start-Process -FilePath $installedExe -PassThru
Start-Sleep -Seconds 5
$installLaunchOk = -not $appProcess.HasExited
if ($installLaunchOk) {
  Stop-Process -Id $appProcess.Id -Force
}

if (-not $installLaunchOk) {
  throw "Installed app did not remain running after launch"
}

if (Test-Path $pathCheckDir) {
  Remove-Item -LiteralPath $pathCheckDir -Recurse -Force
}

Copy-Item -LiteralPath $unpackedDir -Destination $pathCheckDir -Recurse -Force
$pathCheckExe = Join-Path $pathCheckDir "video_tool.exe"
if (-not (Test-Path $pathCheckExe)) {
  throw "Path check executable not found: $pathCheckExe"
}

$pathProcess = Start-Process -FilePath $pathCheckExe -PassThru
Start-Sleep -Seconds 5
$pathLaunchOk = -not $pathProcess.HasExited
if ($pathLaunchOk) {
  Stop-Process -Id $pathProcess.Id -Force
}

if (-not $pathLaunchOk) {
  throw "App did not remain running from Chinese/space path"
}

Write-Output "package checks passed"
