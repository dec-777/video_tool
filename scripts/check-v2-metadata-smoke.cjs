const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const {
  addTasks,
  configureTaskQueue,
  getTasks
} = require("../electron/services/taskQueue");

const testUrl = process.env.METADATA_TEST_URL || "https://vimeo.com/76979871";
const outputDir = path.join(
  __dirname,
  "..",
  "downloads",
  "metadata smoke test",
  String(Date.now())
);
const timeoutMs = 240000;

useWorkspaceUserData(app, "check-v2-metadata-smoke");

app.whenReady()
  .then(async () => {
    fs.mkdirSync(outputDir, { recursive: true });
    configureTaskQueue({ getMainWindow: () => null, concurrentDownloads: 1 });

    const [task] = addTasks({
      urls: [testUrl],
      mode: "video",
      quality: {
        preset: "worst",
        container: "mp4"
      },
      audio: {
        format: "mp3"
      },
      metadata: {
        thumbnail: true,
        embedThumbnail: true,
        description: true,
        infoJson: true,
        comments: false,
        embedMetadata: true
      },
      file: {
        outputDir,
        outputTemplate: "metadata.%(ext)s"
      }
    });

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const current = getTasks().find((item) => item.id === task.id);

      if (!current) {
        finish(1, "metadata smoke task disappeared");
        return;
      }

      if (current.status === "failed") {
        finish(1, `metadata smoke failed: ${current.error || current.rawError}`);
        return;
      }

      if (current.status === "completed") {
        const files = listFiles(outputDir);
        const infoJson = files.find((file) => /\.info\.json$/i.test(file));
        const description = files.find((file) => /\.description$/i.test(file));
        const thumbnail = files.find((file) => /\.(jpe?g|png|webp)$/i.test(file));
        const media = files.find((file) => /\.(mp4|webm|mkv|mov)$/i.test(file));

        if (!infoJson || !description || !thumbnail || !media) {
          finish(1, `metadata smoke missing files: ${files.join(", ")}`);
          return;
        }

        const emptyFile = [infoJson, description, thumbnail, media].find(
          (file) => fs.statSync(path.join(outputDir, file)).size === 0
        );
        if (emptyFile) {
          finish(1, `metadata smoke produced empty file: ${emptyFile}`);
          return;
        }

        finish(0, `metadata smoke passed: ${files.join(", ")}`);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        finish(1, "metadata smoke timed out");
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
