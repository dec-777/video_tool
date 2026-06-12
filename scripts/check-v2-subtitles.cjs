const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const { buildYtdlpArgs } = require("../electron/services/commandBuilder");
const { getConfig, saveConfig } = require("../electron/services/configStore");
const { mapVideoInfo } = require("../electron/services/ytdlpService");

useWorkspaceUserData(app, "check-v2-subtitles");

const root = path.join(__dirname, "..");
const outputDir = path.join(root, "downloads", "字幕 提取 检查");

app.whenReady()
  .then(() => {
    fs.mkdirSync(outputDir, { recursive: true });

    const args = buildYtdlpArgs({
      urls: ["https://example.com/video"],
      mode: "subtitle-only",
      subtitles: {
        writeSubs: true,
        writeAutoSubs: true,
        languages: ["zh-Hans", "en"],
        format: "srt",
        embed: true
      },
      file: {
        outputDir,
        outputTemplate: "%(title)s.%(ext)s"
      }
    });

    assertIncludes(args, [
      "--skip-download",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      "zh-Hans,en",
      "--convert-subs",
      "srt"
    ]);
    assertNotIncludes(args, ["--embed-subs", "--merge-output-format", "-x"]);

    const saved = saveConfig({
      defaultMode: "subtitle-only",
      defaultOutputDir: outputDir,
      outputTemplate: "%(title)s.%(ext)s"
    });
    const loaded = getConfig();
    if (saved.defaultMode !== "subtitle-only" || loaded.defaultMode !== "subtitle-only") {
      throw new Error("subtitle-only defaultMode was not persisted");
    }

    const info = mapVideoInfo(
      {
        id: "abc",
        title: "Subtitle video",
        subtitles: {
          en: [{ ext: "vtt" }]
        },
        automatic_captions: {
          "zh-Hans": [{ ext: "vtt" }]
        }
      },
      "https://example.com/video"
    );

    if (!info.subtitles.en || !info.automaticCaptions["zh-Hans"]) {
      throw new Error("video subtitle language metadata was not mapped");
    }

    assertRendererContains("src/App.jsx", "subtitle: SubtitlePage");
    assertRendererContains("src/layouts/Sidebar.jsx", "字幕提取");
    assertRendererContains("src/pages/HomePage.jsx", "subtitle-only");
    assertRendererContains("src/pages/BatchPage.jsx", "仅字幕");
    assertRendererContains("src/pages/PlaylistPage.jsx", "subtitle-only");
    assertRendererContains("src/pages/SettingsPage.jsx", "subtitle-only");
    assertRendererContains("src/pages/SubtitlePage.jsx", "提取字幕");

    console.log("v2 subtitle checks passed");
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

function assertRendererContains(file, text) {
  const fullPath = path.join(root, file);
  const source = fs.readFileSync(fullPath, "utf8");
  if (!source.includes(text)) {
    throw new Error(`${file} does not contain ${text}`);
  }
}
