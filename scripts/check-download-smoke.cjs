const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const { app } = require("electron");
const { useWorkspaceUserData } = require("./testUserData.cjs");
const {
  addTasks,
  cancelTask,
  configureTaskQueue,
  getTasks,
  retryTask
} = require("../electron/services/taskQueue");
const { getFfmpegPath } = require("../electron/utils/pathUtils");

const outputDir = path.join(__dirname, "..", "downloads", "阶段5 smoke test");
const sourceDir = path.join(__dirname, "..", "downloads", "阶段5 smoke source");
const sourceFile = path.join(sourceDir, "sample.mp4");
const timeoutMs = 240000;

useWorkspaceUserData(app, "check-download-smoke");

app.whenReady()
  .then(async () => {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });
    await ensureSourceVideo();

    const server = await startStaticServer(sourceFile);
    const testUrl = `http://127.0.0.1:${server.port}/sample.mp4`;

    configureTaskQueue({ getMainWindow: () => null, concurrentDownloads: 1 });

    const tasks = [
      ...addTasks({
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
          outputTemplate: "video.%(ext)s"
        },
        videoInfo: {
          title: "本地测试视频",
          extractor: "LocalHTTP",
          thumbnail: "",
          webpageUrl: `${testUrl}?canonicalized=1`
        }
      }),
      ...addTasks({
        urls: [testUrl],
        mode: "audio",
        quality: {
          preset: "best",
          container: "mp4"
        },
        audio: {
          format: "mp3"
        },
        file: {
          outputDir,
          outputTemplate: "audio-mp3.%(ext)s"
        }
      }),
      ...addTasks({
        urls: [testUrl],
        mode: "audio",
        quality: {
          preset: "best",
          container: "mp4"
        },
        audio: {
          format: "m4a"
        },
        file: {
          outputDir,
          outputTemplate: "audio-m4a.%(ext)s"
        }
      })
    ];
    const taskIds = new Set(tasks.map((task) => task.id));
    if (tasks[0].title !== "本地测试视频" || tasks[0].site !== "LocalHTTP") {
      throw new Error("parsed video metadata was not copied into the created task");
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const currentTasks = getTasks().filter((item) => taskIds.has(item.id));

      if (currentTasks.length !== taskIds.size) {
        finish(1, "one or more smoke tasks disappeared");
        return;
      }

      const failed = currentTasks.find((item) => item.status === "failed");
      if (failed) {
        finish(1, `download smoke check failed: ${failed.error || failed.rawError}`);
        return;
      }

      if (currentTasks.every((item) => item.status === "completed")) {
        const brokenOutput = currentTasks.find((item) => hasReplacementChar(item.outputFile));
        if (brokenOutput) {
          finish(1, `download output path contains replacement characters: ${brokenOutput.outputFile}`);
          return;
        }

        if (!rejectsInvalidCompletedActions(currentTasks[0].id)) {
          finish(1, "completed task accepted cancel or retry");
          return;
        }

        finish(0, "download smoke check passed");
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        finish(1, "download smoke check timed out");
      }
    }, 1000);

    function finish(code, message) {
      clearInterval(timer);
      server.close();
      if (code === 0) {
        console.log(message);
      } else {
        console.error(message);
      }
      app.exit(code);
    }
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });

function ensureSourceVideo() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      getFfmpegPath(),
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=128x72:rate=1",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=1000:duration=1",
        "-t",
        "1",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        sourceFile
      ],
      { windowsHide: true }
    );

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString("utf8");
    });
    child.stderr.on("data", (data) => {
      output += data.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(output || `ffmpeg exited with code ${code}`));
      }
    });
  });
}

function startStaticServer(filePath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      if (request.url !== "/sample.mp4") {
        response.writeHead(404);
        response.end();
        return;
      }

      response.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": fs.statSync(filePath).size
      });
      fs.createReadStream(filePath).pipe(response);
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        close: () => server.close(),
        port: address.port
      });
    });
  });
}

function hasReplacementChar(value) {
  return String(value || "").includes("\uFFFD");
}

function rejectsInvalidCompletedActions(taskId) {
  try {
    cancelTask(taskId);
    return false;
  } catch {
    // Expected: completed tasks cannot be canceled.
  }

  try {
    retryTask(taskId);
    return false;
  } catch {
    // Expected: only failed tasks can be retried.
  }

  return true;
}
