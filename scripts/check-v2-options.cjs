const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const {
  buildCommandPreview,
  buildYtdlpArgs,
  normalizeDownloadOptions
} = require("../electron/services/commandBuilder");

useWorkspaceUserData(app, "check-v2-options");

const root = path.join(__dirname, "..");
const outputDir = path.join(root, "downloads", "阶段V2 参数 检查");
const cookieFile = path.join(root, ".tmp", "test-cookies.txt");
const archivePath = path.join(root, ".tmp", "archive 检查.txt");

app.whenReady()
  .then(() => {
    fs.mkdirSync(path.dirname(cookieFile), { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(cookieFile, "# Netscape HTTP Cookie File\n", "utf8");

    const args = buildYtdlpArgs({
      urls: ["https://example.com/watch?v=v2"],
      mode: "video",
      quality: {
        preset: "resolution",
        resolution: 720,
        container: "mkv"
      },
      audio: {
        format: "flac"
      },
      subtitles: {
        writeSubs: true,
        writeAutoSubs: true,
        languages: ["zh-Hans", "en"],
        format: "srt",
        embed: true
      },
      metadata: {
        thumbnail: true,
        embedThumbnail: true,
        description: true,
        infoJson: true,
        comments: true,
        embedMetadata: true
      },
      auth: {
        cookiesMode: "file",
        cookiesFile: cookieFile
      },
      network: {
        proxyEnabled: true,
        proxy: "socks5://127.0.0.1:7890",
        retries: 3,
        limitRate: "2M"
      },
      file: {
        outputDir,
        outputTemplate: "%(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s",
        archiveEnabled: true,
        archivePath,
        keepIntermediateFiles: true
      },
      playlist: {
        enabled: true,
        start: 2,
        end: 5,
        items: "2-5"
      }
    });

    assertIncludes(args, ["-f", "bv*[height<=720]+ba/b[height<=720]"]);
    assertIncludes(args, ["--merge-output-format", "mkv"]);
    assertIncludes(args, ["--write-subs", "--write-auto-subs", "--sub-langs", "zh-Hans,en"]);
    assertIncludes(args, ["--convert-subs", "srt", "--embed-subs"]);
    assertIncludes(args, ["--write-thumbnail", "--embed-thumbnail", "--write-description"]);
    assertIncludes(args, ["--write-info-json", "--write-comments", "--embed-metadata"]);
    assertIncludes(args, ["--cookies", cookieFile]);
    assertIncludes(args, ["--proxy", "socks5://127.0.0.1:7890"]);
    assertIncludes(args, ["--retries", "3", "--fragment-retries", "3", "--limit-rate", "2M"]);
    assertIncludes(args, ["--download-archive", archivePath, "--keep-video"]);
    assertIncludes(args, ["--playlist-start", "2", "--playlist-end", "5", "--playlist-items", "2-5"]);
    assertNotIncludes(args, ["--no-playlist"]);

    const subtitleOnlyArgs = buildYtdlpArgs({
      urls: ["https://example.com/subs"],
      mode: "subtitle-only",
      subtitles: {
        writeAutoSubs: true,
        languages: "zh-Hans,en",
        format: "vtt",
        embed: true
      },
      file: {
        outputDir,
        outputTemplate: "%(title)s.%(ext)s"
      }
    });
    assertIncludes(subtitleOnlyArgs, [
      "--skip-download",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      "zh-Hans,en",
      "--convert-subs",
      "vtt"
    ]);
    assertNotIncludes(subtitleOnlyArgs, ["--embed-subs", "-f", "-x"]);

    const browserPreview = buildCommandPreview({
      urls: ["https://example.com/browser"],
      mode: "audio",
      audio: { format: "opus" },
      auth: {
        cookiesMode: "browser",
        cookiesFromBrowser: "edge"
      },
      file: {
        outputDir,
        outputTemplate: "%(title)s.%(ext)s"
      }
    });
    if (!browserPreview.includes("--cookies-from-browser edge")) {
      throw new Error(`browser cookie preview missing: ${browserPreview}`);
    }

    assertThrows(
      () =>
        normalizeDownloadOptions({
          urls: ["https://example.com/missing-cookie"],
          auth: {
            cookiesMode: "file",
            cookiesFile: path.join(root, ".tmp", "missing-cookies.txt")
          },
          file: {
            outputDir,
            outputTemplate: "%(title)s.%(ext)s"
          }
        }),
      "missing cookie file was accepted"
    );

    assertThrows(
      () =>
        normalizeDownloadOptions({
          urls: ["https://example.com/bad-proxy"],
          network: {
            proxyEnabled: true,
            proxy: "ftp://127.0.0.1:21"
          },
          file: {
            outputDir,
            outputTemplate: "%(title)s.%(ext)s"
          }
        }),
      "invalid proxy was accepted"
    );

    console.log("v2 option checks passed");
    app.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    app.exit(1);
  });

function assertIncludes(args, expected) {
  for (const item of expected) {
    if (!args.includes(item)) {
      throw new Error(`Expected args to include ${item}. Actual: ${args.join(" ")}`);
    }
  }
}

function assertNotIncludes(args, forbidden) {
  for (const item of forbidden) {
    if (args.includes(item)) {
      throw new Error(`Expected args not to include ${item}. Actual: ${args.join(" ")}`);
    }
  }
}

function assertThrows(fn, message) {
  try {
    fn();
  } catch {
    return;
  }

  throw new Error(message);
}
