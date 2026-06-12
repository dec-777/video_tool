const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const DEFAULT_CONFIG = require("../electron/constants/defaultConfig");
const { getConfig, saveConfig } = require("../electron/services/configStore");
const {
  addHistoryRecord,
  clearHistory,
  getHistory
} = require("../electron/services/historyStore");

useWorkspaceUserData(app, "check-persistence");

app.whenReady()
  .then(() => {
    const saved = saveConfig({
      defaultOutputDir: "E:\\下载 测试",
      defaultMode: "audio",
      defaultAudioFormat: "m4a",
      outputTemplate: "%(title)s.%(ext)s",
      concurrentDownloads: 2,
      quality: {
        preset: "resolution",
        resolution: 720,
        container: "mkv"
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
        comments: false,
        embedMetadata: true
      },
      auth: {
        cookiesMode: "browser",
        cookiesFromBrowser: "edge"
      },
      network: {
        proxyEnabled: true,
        proxy: "http://127.0.0.1:7890",
        retries: 3,
        limitRate: "2M"
      },
      file: {
        archiveEnabled: true,
        archivePath: "E:\\下载 测试\\archive.txt",
        keepIntermediateFiles: true
      },
      theme: "system"
    });

    const loaded = getConfig();
    if (
      loaded.defaultOutputDir !== saved.defaultOutputDir ||
      loaded.defaultMode !== "audio" ||
      loaded.defaultAudioFormat !== "m4a" ||
      loaded.concurrentDownloads !== 2 ||
      loaded.quality.preset !== "resolution" ||
      loaded.quality.container !== "mkv" ||
      loaded.subtitles.writeSubs !== true ||
      loaded.subtitles.languages.join(",") !== "zh-Hans,en" ||
      loaded.metadata.infoJson !== true ||
      loaded.auth.cookiesMode !== "browser" ||
      loaded.auth.cookiesFromBrowser !== "edge" ||
      loaded.network.proxy !== "http://127.0.0.1:7890" ||
      loaded.network.retries !== 3 ||
      loaded.file.archiveEnabled !== true ||
      loaded.file.keepIntermediateFiles !== true
    ) {
      throw new Error("config persistence check failed");
    }

    clearHistory();
    addHistoryRecord({
      id: "task_persistence_check",
      url: "https://example.com/video",
      site: "example",
      status: "completed",
      outputDir: "E:\\下载 测试",
      outputTemplate: "%(title)s.%(ext)s",
      outputFile: "E:\\下载 测试\\video.mp4",
      startedAt: 1,
      completedAt: 2,
      options: {
        urls: ["https://example.com/video"],
        mode: "video",
        file: {
          outputDir: "E:\\下载 测试",
          outputTemplate: "%(title)s.%(ext)s"
        }
      }
    });

    const history = getHistory();
    if (history.length !== 1 || history[0].id !== "task_persistence_check") {
      throw new Error("history persistence check failed");
    }

    clearHistory();
    saveConfig(DEFAULT_CONFIG);
    console.log("persistence checks passed");
    app.exit(0);
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
