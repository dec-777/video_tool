const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const DEFAULT_CONFIG = require("../electron/constants/defaultConfig");
const { getConfig, getConfigPath, saveConfig } = require("../electron/services/configStore");
const {
  addHistoryRecord,
  clearHistory,
  getHistory
} = require("../electron/services/historyStore");
const { writeTaskLog } = require("../electron/services/logService");
const { getUserDataPath } = require("../electron/utils/pathUtils");

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
    verifyBrokenConfigRecovery();
    verifyLogSanitization();
    saveConfig(DEFAULT_CONFIG);
    console.log("persistence checks passed");
    app.exit(0);
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });

function verifyBrokenConfigRecovery() {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, "{broken json", "utf8");

  const recovered = getConfig();
  if (recovered.configVersion !== DEFAULT_CONFIG.configVersion) {
    throw new Error("broken config was not recovered to defaults");
  }

  const backupFile = fs
    .readdirSync(path.dirname(configPath))
    .find((file) => file.startsWith("config.json.broken-") && file.endsWith(".bak"));

  if (!backupFile) {
    throw new Error("broken config was not backed up");
  }
}

function verifyLogSanitization() {
  writeTaskLog("sensitive_check", "sensitive command", {
    args: ["--cookies", "E:\\secret\\cookies.txt"],
    Authorization: "Bearer secret-token",
    password: "secret-password",
    cookiesFile: "E:\\secret\\cookies.txt",
    cookiesFromBrowser: "edge"
  });

  const logPath = getUserDataPath("logs", "task-sensitive_check.log");
  const logText = fs.readFileSync(logPath, "utf8");
  for (const secret of ["cookies.txt", "secret-token", "secret-password", "edge"]) {
    if (logText.includes(secret)) {
      throw new Error(`sensitive log value was not sanitized: ${secret}`);
    }
  }
}
