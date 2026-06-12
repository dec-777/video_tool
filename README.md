# video_tool

Windows desktop video download tool built with Electron, React, Vite, yt-dlp, and FFmpeg.

## Requirements

- Windows 10 or Windows 11
- Node.js 20+
- npm
- PowerShell 5+

## Local Setup

```powershell
git clone https://github.com/dec-777/video_tool.git
cd video_tool
npm install
npm run setup:binaries
npm run dev
```

`npm run dev` also runs `setup:binaries` automatically before starting.

## Build Installer

```powershell
npm install
npm run setup:binaries
npm run build
```

Build output:

```text
release/video_tool Setup 0.1.0.exe
release/win-unpacked/video_tool.exe
```

## Useful Checks

```powershell
npm run check:desktop
npm run check:binaries
npm run check:dev-start
npm run build:renderer
npm run build
npm run check:package
```

## Binary Tools

The repository does not commit local `.exe` files.

`npm run setup:binaries` downloads:

- `bin/yt-dlp.exe` from the official yt-dlp GitHub release URL
- `bin/ffmpeg.exe` and `bin/ffprobe.exe` from Gyan FFmpeg Windows builds

These files stay local and are ignored by Git.

## Project Structure

```text
electron/   Electron main process, preload, IPC, and services
src/        React renderer UI
scripts/    development, check, packaging, and binary setup scripts
docs/       project documents and verification reports
build/      app icon resources
bin/        local downloaded binaries, ignored except .gitkeep
data/       example config data
```

## Notes

- Renderer code does not use Node.js system APIs directly.
- yt-dlp is invoked through `child_process.spawn(args[])`.
- Runtime config, history, and logs are written to Electron `userData`.
