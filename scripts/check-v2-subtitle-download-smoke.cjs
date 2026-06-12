const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const {
  addTasks,
  configureTaskQueue,
  getTasks
} = require("../electron/services/taskQueue");

const testUrl =
  process.env.SUBTITLE_TEST_URL ||
  "https://www.ted.com/talks/ken_robinson_says_schools_kill_creativity";
const testLanguage = process.env.SUBTITLE_TEST_LANG || "en";
const outputDir = path.join(
  __dirname,
  "..",
  "downloads",
  "subtitle smoke test",
  String(Date.now())
);
const timeoutMs = 180000;

useWorkspaceUserData(app, "check-v2-subtitle-download");

app.whenReady()
  .then(async () => {
    fs.mkdirSync(outputDir, { recursive: true });
    configureTaskQueue({ getMainWindow: () => null, concurrentDownloads: 1 });

    const [task] = addTasks({
      urls: [testUrl],
      mode: "subtitle-only",
      subtitles: {
        writeSubs: true,
        writeAutoSubs: false,
        languages: [testLanguage],
        format: "vtt",
        embed: false
      },
      file: {
        outputDir,
        outputTemplate: "subtitle.%(ext)s"
      }
    });

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const current = getTasks().find((item) => item.id === task.id);

      if (!current) {
        finish(1, "subtitle smoke task disappeared");
        return;
      }

      if (current.status === "failed") {
        finish(1, `subtitle download smoke failed: ${current.error || current.rawError}`);
        return;
      }

      if (current.status === "completed") {
        const files = listFiles(outputDir).filter((file) =>
          new RegExp(`\\.${escapeRegExp(testLanguage)}\\.vtt$`, "i").test(file)
        );

        if (files.length === 0) {
          finish(1, `subtitle smoke completed but no ${testLanguage}.vtt file was found`);
          return;
        }

        const emptyFile = files.find((file) => fs.statSync(path.join(outputDir, file)).size === 0);
        if (emptyFile) {
          finish(1, `subtitle file is empty: ${emptyFile}`);
          return;
        }

        finish(0, `subtitle download smoke passed: ${files.join(", ")}`);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        finish(1, "subtitle download smoke timed out");
      }
    }, 1000);

    function finish(code, message) {
      clearInterval(timer);
      if (code === 0) {
        console.log(message);
      } else {
        console.error(message);
      }
      app.exit(code);
    }
  })
  .catch((error) => {
    console.error(error.rawMessage || error.message || error);
    app.exit(1);
  });

function listFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir).filter((file) => fs.statSync(path.join(dir, file)).isFile());
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
