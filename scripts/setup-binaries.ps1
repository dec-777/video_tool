param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$binDir = Join-Path $root "bin"
$cacheDir = Join-Path $root ".tmp\binaries"
$ffmpegZip = Join-Path $cacheDir "ffmpeg-release-essentials.zip"
$extractDir = Join-Path $cacheDir "ffmpeg"

$ytDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
$ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

New-Item -ItemType Directory -Force -Path $binDir, $cacheDir | Out-Null

$ytDlpPath = Join-Path $binDir "yt-dlp.exe"
$ffmpegPath = Join-Path $binDir "ffmpeg.exe"
$ffprobePath = Join-Path $binDir "ffprobe.exe"

function Assert-UnderRoot($PathToCheck) {
  $resolvedRoot = [System.IO.Path]::GetFullPath($root)
  $resolvedPath = [System.IO.Path]::GetFullPath($PathToCheck)
  if (-not $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "refusing to operate outside project root: $resolvedPath"
  }
}

if ((Test-Path $ytDlpPath) -and (Test-Path $ffmpegPath) -and (Test-Path $ffprobePath) -and -not $Force) {
  Write-Output "binaries already exist"
  exit 0
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ($Force -or -not (Test-Path $ytDlpPath)) {
  Write-Output "downloading yt-dlp.exe"
  Invoke-WebRequest -Uri $ytDlpUrl -OutFile $ytDlpPath
}

if ($Force -or -not (Test-Path $ffmpegPath) -or -not (Test-Path $ffprobePath)) {
  Write-Output "downloading FFmpeg tools"
  Invoke-WebRequest -Uri $ffmpegUrl -OutFile $ffmpegZip

  if (Test-Path $extractDir) {
    Assert-UnderRoot $extractDir
    Remove-Item -LiteralPath $extractDir -Recurse -Force
  }

  Expand-Archive -LiteralPath $ffmpegZip -DestinationPath $extractDir -Force

  $extractedFfmpeg = Get-ChildItem -LiteralPath $extractDir -Recurse -Filter "ffmpeg.exe" |
    Select-Object -First 1
  $extractedFfprobe = Get-ChildItem -LiteralPath $extractDir -Recurse -Filter "ffprobe.exe" |
    Select-Object -First 1

  if (-not $extractedFfmpeg -or -not $extractedFfprobe) {
    throw "ffmpeg.exe or ffprobe.exe not found in downloaded archive"
  }

  Copy-Item -LiteralPath $extractedFfmpeg.FullName -Destination $ffmpegPath -Force
  Copy-Item -LiteralPath $extractedFfprobe.FullName -Destination $ffprobePath -Force
}

foreach ($path in @($ytDlpPath, $ffmpegPath, $ffprobePath)) {
  if (-not (Test-Path $path)) {
    throw "required binary missing: $path"
  }
}

Write-Output "binaries ready in $binDir"
