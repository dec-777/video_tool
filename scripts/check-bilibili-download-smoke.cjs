const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const { addTasks, configureTaskQueue, getTasks } = require("../electron/services/taskQueue");

const testUrl =
  process.env.BILIBILI_TEST_URL || "https://www.bilibili.com/video/BV1DPVw6sEhK/";
const outputDir = path.join(
  __dirname,
  "..",
  "downloads",
  "bilibili smoke test",
  String(Date.now())
);
const timeoutMs = 300000;

useWorkspaceUserData(app, "check-bilibili-download");

app.whenReady()
  .then(async () => {
    fs.mkdirSync(outputDir, { recursive: true });
    configureTaskQueue({ getMainWindow: () => null, concurrentDownloads: 1 });

    const [task] = addTasks({
      urls: [testUrl],
      mode: "video",
      quality: {
        preset: "best",
        container: "mp4"
      },
      audio: {
        format: "mp3"
      },
      file: {
        outputDir,
        outputTemplate: "%(title)s.%(ext)s"
      }
    });

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const current = getTasks().find((item) => item.id === task.id);

      if (!current) {
        finish(1, "bilibili smoke task disappeared");
        return;
      }

      if (current.status === "failed") {
        finish(1, `bilibili download smoke failed: ${current.error || current.rawError}`);
        return;
      }

      if (current.status === "completed") {
        if (String(current.outputFile || "").includes("\uFFFD")) {
          finish(1, `bilibili output path contains replacement characters: ${current.outputFile}`);
          return;
        }

        const downloaded = fs.readdirSync(outputDir);

        if (downloaded.length === 0) {
          finish(1, `bilibili download completed but no output file was found in ${outputDir}`);
          return;
        }

        finish(0, `bilibili download smoke passed: ${downloaded.join(", ")}`);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        finish(1, "bilibili download smoke timed out");
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
